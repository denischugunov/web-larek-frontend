import './scss/styles.scss';
import { Api } from './components/base/api';
import { API_URL, CDN_URL } from './utils/constants';
import { EventEmitter, IEvents } from './components/base/events';
import { cloneTemplate } from './utils/utils';

// Модель товара

interface IProduct {
	id: string;
	description: string;
	image: string;
	title: string;
	category: Category; // Используем enum для категории
	price: number | null; // Цена может быть числом или null
}

enum Category {
	soft = 'софт-скил',
	hard = 'хард-скил',
	button = 'кнопка',
	other = 'другое',
	additional = 'дополнительное',
}

// Модель продуктового листа

interface IProductList {
	items: IProduct[]; // Массив товаров
}

interface ISendOrderResponse {
	id: string; // Идентификатор заказа
	total: number; // Итоговая сумма заказа
}

class ModalApi extends Api {
	private cdn: string;
	constructor(baseUrl: string, cdn: string, options: RequestInit = {}) {
		super(baseUrl, options);
		this.cdn = cdn;
	}

	async getProducts(): Promise<IProduct[]> {
		const data = (await this.get('/product/')) as {
			total: number;
			items: IProduct[];
		};
		return data.items.map((item) => ({
			...item,
			image: this.cdn + item.image,
		}));
	}

	async getProductItem(id: string): Promise<IProduct> {
		return (await this.get(`/product/${id}`)) as IProduct;
	}

	async getOrder(): Promise<ISendOrderResponse> {
		return (await this.get('/order')) as ISendOrderResponse;
	}
}

const events = new EventEmitter();

class ProductList implements IProductList {
	private _items: IProduct[];

	constructor(protected events: IEvents) {}

	get items(): IProduct[] {
		return this._items;
	}

	set items(products: IProduct[]) {
		this._items = products;
		this.emitChanges('productList:changed', products);
	}

	// Сообщить всем что модель поменялась
	emitChanges(event: string, payload?: object) {
		// Состав данных можно модифицировать
		this.events.emit(event, payload ?? {});
	}
}

const productList = new ProductList(events);

const api = new ModalApi(API_URL, CDN_URL);

// Представление карточки товара

interface IProductUI {
	productData: IProduct;
	template: HTMLElement;

	// Методы
	render(): Node; // Метод рендеринга, который будет реализован в каждом виде карточки (с разными темплейтами)
}

// Класс ProductUI имплементирует интерфейс IProductUI,
// а наследуют класс ProductUI: ProductСardСatalogUI, ProductCardPreviewUI, ProductCardBasketUI.
// Это нужно для реализации паттерна стратегия, когда класс ProductCardRenderer
// будет отбирать нужную стратегию в зависимости от используемого темплейта

// интерфейс класса, реализующего выбор стратегии, создающего как фабрика нужный объект и метод рендеринга карточки в выбранный контейнер

interface IProductCardRenderer {
	// Методы
	render(container: HTMLElement): void; // Метод для рендеринга карточки в указанный контейнер (он тут, а не в методе карточки для сохранения принципа единой отвественности)
}

// Представление продуктового листа

interface IProductListUI {
	container: Node; // Контейнер, куда будут отрендерены карточки
	items: IProduct[]; // Массив товаров

	// Методы
	render(): void; // Метод рендеринга всех карточек в галерее главной страницы
}

class ProductListUI implements IProductListUI {
	container: Node;
	items: IProduct[];

	constructor(container: Node, items: IProduct[]) {
		this.container = container;
		this.items = items;
	}

	render(): void {
		this.items.forEach((item: IProduct): void => {
			const productCardRenderer = new ProductCardRenderer(
				item,
				cardCatalogTemplate
			);
			productCardRenderer.render(this.container);
		});
	}
}

const cardCatalogTemplate: HTMLTemplateElement =
	document.querySelector('#card-catalog');
const cardPreviewTemplate: HTMLTemplateElement =
	document.querySelector('#card-preview');
const cardBasketTemplate: HTMLTemplateElement =
	document.querySelector('#card-basket');

abstract class ProductUI implements IProductUI {
	productData: IProduct;
	template: HTMLTemplateElement;
	protected constructor(productData: IProduct, template: HTMLTemplateElement) {
		this.productData = productData;
		this.template = cloneTemplate(template);
	}

	abstract render(): Node;
}

class ProductCardCatalogUI extends ProductUI {
	constructor(productData: IProduct, template: HTMLTemplateElement) {
		super(productData, template);
	}

	protected createCategory() {
		const category = this.template.querySelector('.card__category');
		let modification = '';
		switch (this.productData.category) {
			case 'софт-скил':
				modification = 'soft';
				break;
			case 'хард-скил':
				modification = 'hard';
				break;
			case 'кнопка':
				modification = 'button';
				break;
			case 'другое':
				modification = 'other';
				break;
			case 'дополнительное':
				modification = 'additional';
				break;
			default:
				break;
		}
		category.className = `card__category card__category_${modification}`;
		category.textContent = this.productData.category;
		return category;
	}

	protected createTitle() {
		const title = this.template.querySelector('.card__title');
		title.textContent = this.productData.title;
		return title;
	}

	protected createImage() {
		const image: HTMLImageElement = this.template.querySelector('.card__image');
		image.src = `${this.productData.image}`;
		image.alt = this.productData.title;
		return image;
	}

	protected createPrice() {
		const price = this.template.querySelector('.card__price');
		price.textContent = `${this.productData.price} синапсов`;
	}

	render(): Node {
		this.createCategory();
		this.createTitle();
		this.createImage();
		this.createPrice();
		return this.template;
	}
}

// class ProductCardPreviewUI extends ProductUI {
// 	constructor(productData: IProduct, template: HTMLElement) {
// 		super(productData, template);
// 	}
// }
//
// class ProductCardBasketUI extends ProductUI {
// 	constructor(productData: IProduct, template: HTMLElement) {
// 		super(productData, template);
// 	}
// }

class ProductCardRenderer {
	productCard: IProductUI;
	constructor(productData: IProduct, template: HTMLTemplateElement) {
		switch (template) {
			case cardCatalogTemplate:
				this.productCard = new ProductCardCatalogUI(productData, template);
				break;
			// case cardPreviewTemplate:
			// 	this.cardType = new ProductCardPreviewUI(productData, template);
			// 	break;
			// case cardBasketTemplate:
			// 	this.cardType = new ProductCardBasketUI(productData, template);
			// 	break;
		}
	}

	render(container: Node): void {
		const renderedCard = this.productCard.render();
		container.appendChild(renderedCard);
	}
}

const testContainer = document.querySelector('.gallery');
// Получаю список продуктов с сервера
api
	.getProducts()
	.then((data) => {
		productList.items = data;
		return data;
	})
	.then((data) => {
		const productListUI = new ProductListUI(testContainer, data);
		productListUI.render();
	})
	.catch((error) => {
		console.error(error);
	});

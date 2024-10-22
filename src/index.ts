import './scss/styles.scss';
import { Api } from './components/base/api';
import { API_URL, CDN_URL } from './utils/constants';
import { EventEmitter, IEvents } from './components/base/events';
import { cloneTemplate } from './utils/utils';

// Создаем новый брокер событий
const events = new EventEmitter();

// Интерфейс ответа при отправке заказа на сервер
interface ISendOrderResponse {
	id: string; // Идентификатор заказа
	total: number; // Итоговая сумма заказа
}

interface ISendRequest {
	payment: string;
	email: string;
	phone: string;
	address: string;
	total: number;
	items: string[];
}

// Класс расширяет стандартный Api и позволяет получать и преобразовывать данные карточек, отдельной карточки, а также отправлять данные заказа
class ModalApi extends Api {
	private readonly cdn: string;
	// baseUrl - общая часть пути для соединения, cdn - часть пути для получения изображений
	constructor(baseUrl: string, cdn: string, options: RequestInit = {}) {
		super(baseUrl, options);
		this.cdn = cdn;
	}

	async getProducts(): Promise<IProduct[]> {
		const data = (await this.get('/product/')) as {
			total: number;
			items: IProduct[];
		};
		// проверяю равна ли цена null, преобразую пути изображений в полные
		return data.items.map((item) => ({
			...item,
			price: item.price === null ? 0 : item.price,
			image: this.cdn + item.image,
		}));
	}

	async getProductItem(id: string): Promise<IProduct> {
		return (await this.get(`/product/${id}`)) as IProduct;
	}

	async sendOrder(requestData: ISendRequest): Promise<ISendOrderResponse> {
		return (await this.post('/order', requestData)) as ISendOrderResponse;
	}
}

// Создаем новый объект модернизированного апи для получения и отправки данных на сервер
const api = new ModalApi(API_URL, CDN_URL);

// Интерфейс конкретного товара
interface IProduct {
	id: string;
	description: string;
	image: string;
	title: string;
	category: Category; // Используем enum для категории
	price: number | null; // Цена может быть числом или null
}

// Список категорий для тегов товаров
enum Category {
	soft = 'софт-скил',
	hard = 'хард-скил',
	button = 'кнопка',
	other = 'другое',
	additional = 'дополнительное',
}

// Интерфейс продуктового листа (сеттер и геттер позволяют работать с массивом товаров)
interface IProductList {
	items: IProduct[]; // Массив товаров
}

// Модель списка продуктов, позволяет добавлять и получать список, оповещает подписчиков об изменении при добавлении новых (полученных с сервера)
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

// Создаем новую модель продуктового листа со списком всех продуктов
const productList = new ProductList(events);

// Интерфейс всей корзины
interface IBasket {
	totalCost: number; // Итоговая цена корзины
	items: Map<string, IProduct>; // Массив товаров

	// Методы
	addItem(item: IProduct): void; // Добавляет товар в корзину
	removeItem(itemId: string): void; // Убирает товар из корзины
	getTotalCost(): number; // Получение итоговой цены корзины
	getItemsList(): IProduct[]; // Получение массива товаров для дальнейшей работы с ним в заказе
}

class Basket implements IBasket {
	totalCost: number;
	items: Map<string, IProduct>;

	constructor(protected events: IEvents) {
		this.totalCost = 0;
		this.items = new Map<string, IProduct>();
	}

	addItem(item: IProduct): void {
		this.items.set(item.id, item);
		this.updateTotalCost();
	}

	removeItem(itemId: string): void {
		this.items.delete(itemId);
		this.updateTotalCost();
	}

	getTotalCost(): number {
		return this.totalCost;
	}

	getItemsList(): IProduct[] {
		return Array.from(this.items.values());
	}

	// Приватный метод для обновления стоимости всей корзины
	private updateTotalCost(): void {
		let total = 0;
		for (const BasketItem of this.items.values()) {
			total += BasketItem.price;
		}
		this.totalCost = total;
	}
}

// Тип выбора метода оплаты при оформлении заказа
type PaymentMethod = 'Онлайн' | 'При получении';

// Интерфейс модели заказа товаров
interface IOrderData {
	payment: string;
	email: string;
	phone: string;
	address: string;
	// Методы
	sendOrder(api: ModalApi): Promise<void>; // Отправка заказа
}

class OrderData implements IOrderData {
	protected _payment: PaymentMethod = 'Онлайн'; // Способ оплаты
	protected _email = ''; // Почта клиента
	protected _phone = ''; // Телефон клиента
	protected _address = ''; // Адрес доставки
	protected _total: number; // Итоговая стоимость заказа
	protected _items: string[]; // Массив ID товаров (как требуется сервером)

	constructor(
		total: number,
		items: Map<string, IProduct>,
		protected events: IEvents
	) {
		this._total = total;
		this._items = Array.from(items.keys());
	}

	set payment(payment: PaymentMethod) {
		this._payment = payment;
	}

	set email(email: string) {
		this._email = email;
	}

	set phone(phone: string) {
		this._phone = phone;
	}

	set address(address: string) {
		this._address = address;
	}

	async sendOrder(api: ModalApi) {
		const requestData: ISendRequest = {
			payment: this._payment,
			email: this._email,
			phone: this._phone,
			address: this._address,
			total: this._total,
			items: this._items,
		};
		try {
			await api.sendOrder(requestData);
		} catch (err) {
			console.error(err);
		}
	}
}

// ************************************************************************************************************

// Темплейты для создания карточек товаров в разных местах сайта
const cardCatalogTemplate: HTMLTemplateElement =
	document.querySelector('#card-catalog');
const cardPreviewTemplate: HTMLTemplateElement =
	document.querySelector('#card-preview');
const cardBasketTemplate: HTMLTemplateElement =
	document.querySelector('#card-basket');

// интерфейс класса, реализующего выбор стратегии, создающего как фабрика нужный объект и метод рендеринга карточки в выбранный контейнер
interface IProductCardRenderer {
	// Методы
	render(container: HTMLElement): void; // Метод для рендеринга карточки в указанный контейнер (он тут, а не в методе карточки для сохранения принципа единой ответственности)
}

// Класс, создающий объект карточки продукта в зависимости от выбранного темплейта и позволяет вызвать метод рендера конкретной карточки с вставкой её в переданный контейнер
class ProductCardRenderer implements IProductCardRenderer {
	productCard: IProductUI;
	constructor(productData: IProduct, template: HTMLTemplateElement) {
		switch (template) {
			case cardCatalogTemplate:
				this.productCard = new ProductCardCatalogUI(productData, template);
				break;
			case cardPreviewTemplate:
				this.productCard = new ProductCardPreviewUI(productData, template);
				break;
			case cardBasketTemplate:
				this.productCard = new ProductCardBasketUI(productData, template);
				break;
		}
	}

	render(container: Node): void {
		const renderedCard = this.productCard.render();
		container.appendChild(renderedCard);
	}
}

// Общий интерфейс для представления карточки товара, включает в себя данные карточки и готовый темплейт, метод для рендеринга
interface IProductUI {
	productData: IProduct;
	template: HTMLElement;

	// Методы
	render(): Node; // Метод рендеринга, который будет реализован в каждом виде карточки (с разными темплейтами)
}

// Универсальный интерфейс представления всего продуктового листа
interface IProductListUI {
	container: Node; // Контейнер, куда будут отрендерены карточки
	items: IProduct[]; // Массив товаров

	// Методы
	render(cardCatalogTemplate: HTMLTemplateElement): void; // Метод рендеринга всех карточек в галерее главной страницы
}

// Класс позволяет подготовить представление списка продуктов на главной странице
class ProductListUI implements IProductListUI {
	container: Node;
	items: IProduct[];

	constructor(container: Node, items: IProduct[]) {
		this.container = container;
		this.items = items;
	}

	// Метод в цикле подготавливает представление отдельных карточек и и добавляет их в общий контейнер главной страницы
	render(cardCatalogTemplate: HTMLTemplateElement): void {
		this.items.forEach((item: IProduct): void => {
			const productCardRenderer = new ProductCardRenderer(
				item,
				cardCatalogTemplate
			);
			productCardRenderer.render(this.container);
		});
	}
}

// Абстрактный класс для создания отдельных классов карточек в зависимости от места (и темплейта) где они будут отражены на сайте
abstract class ProductUI implements IProductUI {
	productData: IProduct;
	template: HTMLTemplateElement;
	protected constructor(productData: IProduct, template: HTMLTemplateElement) {
		this.productData = productData;
		this.template = cloneTemplate(template);
	}

	protected createCategory() {
		const category = this.template.querySelector('.card__category');
		let modification = '';
		switch (this.productData.category) {
			case Category.soft:
				modification = 'soft';
				break;
			case Category.hard:
				modification = 'hard';
				break;
			case Category.button:
				modification = 'button';
				break;
			case Category.other:
				modification = 'other';
				break;
			case Category.additional:
				modification = 'additional';
				break;
			default:
				break;
		}
		category.className = `card__category card__category_${modification}`;
		category.textContent = this.productData.category;
	}

	protected createTitle() {
		const title = this.template.querySelector('.card__title');
		title.textContent = this.productData.title;
	}

	protected createDescription() {
		const description = this.template.querySelector('.card__text');
		description.textContent = this.productData.description;
	}

	protected createImage() {
		const image: HTMLImageElement = this.template.querySelector('.card__image');
		image.src = `${this.productData.image}`;
		image.alt = this.productData.title;
	}

	protected createPrice() {
		const price = this.template.querySelector('.card__price');
		price.textContent = `${this.productData.price} синапсов`;
	}

	abstract render(): Node;
}

// Класс позволяет подготовить представление продуктовой карточки для ее рендера в виде превью, которое открывается по нажатию на карточку на главной странице или в корзине
class ProductCardPreviewUI extends ProductUI {
	constructor(productData: IProduct, template: HTMLTemplateElement) {
		super(productData, template);
	}

	render(): Node {
		this.createCategory();
		this.createTitle();
		this.createImage();
		this.createPrice();
		this.createDescription();
		return this.template;
	}
}

// Класс позволяет подготовить представление продуктовой карточки для ее рендера в корзине
class ProductCardBasketUI extends ProductUI {
	constructor(productData: IProduct, template: HTMLTemplateElement) {
		super(productData, template);
	}

	render() {
		this.createTitle();
		this.createPrice();
		return this.template;
	}
}

// Класс позволяет подготовить представление продуктовой карточки для ее рендера на главной странице в продуктовом листе
class ProductCardCatalogUI extends ProductUI {
	constructor(productData: IProduct, template: HTMLTemplateElement) {
		super(productData, template);
	}

	render(): Node {
		this.createCategory();
		this.createTitle();
		this.createImage();
		this.createPrice();
		return this.template;
	}
}

// Интерфейс представления корзины
interface IBasketUI {
	items: Map<string, IProduct>;
	template: HTMLElement;
	totalCost: number;

	// Методы
	createPrice(): void; // Метод установки в темплейте корзины итоговой стоимости
	render(cardBasketTemplate: HTMLTemplateElement): HTMLTemplateElement; // Метод рендеринга информации о добавленных в корзину карточках
}

class BasketUI implements IBasketUI {
	items: Map<string, IProduct>;
	totalCost: number;
	template: HTMLTemplateElement;

	constructor(
		items: Map<string, IProduct>,
		totalCost: number,
		template: HTMLTemplateElement
	) {
		this.items = items;
		this.totalCost = totalCost;
		this.template = cloneTemplate(template);
	}

	createPrice() {
		const price = this.template.querySelector('.basket__price');
		price.textContent = `${this.totalCost} синапсов`;
	}

	render(cardBasketTemplate: HTMLTemplateElement) {
		this.createPrice();
		const container = this.template.querySelector('.basket__list');
		for (const item of this.items.values()) {
			const productCardBasketUI = new ProductCardRenderer(
				item,
				cardBasketTemplate
			);
			productCardBasketUI.render(container);
		}
		return this.template;
	}
}

// Интерфейс представление модального окна для заполнения данных о заказе
interface IOrderDataUI {
	// Методы
	render(): void; // Метод рендеринга попапа с формой заполнения
}

interface IOrderDataOrderUI extends IOrderDataUI {
	payment: PaymentMethod; // Способ оплаты
	address: string; // Адрес доставки
	template: HTMLTemplateElement;
}

// Константы темплейтов, отвечающих за формы ввода данных о заказе и пользователе
const orderTemplate = document.querySelector('#order');
const contactsTemplate = document.querySelector('#contacts');

// Класс, отвечающий за рендер модального окна с данными о заказе (1 часть)
class OrderDataOrderUI implements IOrderDataOrderUI {
	payment: PaymentMethod;
	address: string;
	template: HTMLTemplateElement;
	constructor(
		payment: PaymentMethod,
		template: HTMLTemplateElement,
		address: string
	) {
		this.payment = payment;
		this.template = template;
		this.address = address;
	}

	protected selectPaymentMethod() {
		const paymentCardBtn = this.template.querySelector('[name="card"]');
		const paymentCashBtn = this.template.querySelector('[name="cash"]');
		switch (this.payment) {
			case 'Онлайн':
				paymentCardBtn.classList.add('button_alt-active');
				paymentCashBtn.classList.remove('button_alt-active');
				break;
			case 'При получении':
				paymentCardBtn.classList.remove('button_alt-active');
				paymentCashBtn.classList.add('button_alt-active');
				break;
		}
	}

	protected fillInAddress() {
		const addressInputField: HTMLInputElement =
			this.template.querySelector('[name="address"]');
		addressInputField.value = this.address;
	}

	render() {
		this.selectPaymentMethod();
		this.fillInAddress();
		return this.template;
	}
}

interface IOrderDataContactsUI extends IOrderDataUI {
	phone: string; // Телефон клиента
	email: string; // Почта клиента
}

// // Класс, отвечающий за рендер модального окна с данными о покупателе (2 часть)
class OrderDataContactsUI {
	phone: string;
	email: string;
	template: HTMLTemplateElement;

	constructor(phone: string, email: string, template: HTMLTemplateElement) {
		this.phone = phone;
		this.email = email;
		this.template = template;
	}

	protected fillInPhone() {
		const phoneInputField: HTMLInputElement =
			this.template.querySelector('[name="phone"]');
		phoneInputField.value = this.phone;
	}

	protected fillInEmail() {
		const phoneInputEmail: HTMLInputElement =
			this.template.querySelector('[name="email"]');
		phoneInputEmail.value = this.email;
	}

	render() {
		this.fillInPhone();
		this.fillInEmail();
		return this.template;
	}
}

// Просто тест, в будущем будет удален!
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
		productListUI.render(cardCatalogTemplate);
	})
	.catch((error) => {
		console.error(error);
	});


// задачи
// 1. разбросать по модулям и протестировать
// 2. исправить баги и упростить - улучшить
// 3. написать модульное окно success
// 4. начать работу над брокером (подумать над классом с состояниями окон)
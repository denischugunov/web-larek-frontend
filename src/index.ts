import './scss/styles.scss';
import { cloneTemplate, createElement, ensureElement } from './utils/utils';
import { AppState, CatalogChangeEvent } from './components/AppData';
import { Page } from './components/Page';
import { Modal } from './components/common/Modal';
import { Basket } from './components/common/Basket';
import { Order } from './components/common/Order';
import { Contacts } from './components/common/Contacts';
import { EventEmitter } from './components/base/events';
import { ShopApi } from './components/ShopApi';
import { API_URL, CDN_URL } from './utils/constants';
import { Card } from './components/Card';
import { Success } from './components/common/Success';

const events = new EventEmitter();
const api = new ShopApi(API_URL, CDN_URL);

// Чтобы мониторить все события, для отладки
// events.onAll(({ eventName, data }) => {
// 	console.log(eventName, data);
// });

// Все шаблоны
const cardCatalogTemplate = ensureElement<HTMLTemplateElement>('#card-catalog');
const cardPreviewTemplate = ensureElement<HTMLTemplateElement>('#card-preview');
const cardBasketTemplate = ensureElement<HTMLTemplateElement>('#card-basket');
const basketTemplate = ensureElement<HTMLTemplateElement>('#basket');
const orderTemplate = ensureElement<HTMLTemplateElement>('#order');
const contactsTemplate = ensureElement<HTMLTemplateElement>('#contacts');
const successTemplate = ensureElement<HTMLTemplateElement>('#success');

// Модель данных приложения
const appData = new AppState({}, events);

// Глобальные контейнеры
const page = new Page(document.body, events);
const modal = new Modal(ensureElement<HTMLElement>('#modal-container'), events);

// Переиспользуемые части интерфейса
const basket = new Basket(cloneTemplate(basketTemplate), events);
const order = new Order(cloneTemplate(orderTemplate), events);
const contacts = new Contacts(cloneTemplate(contactsTemplate), events);

// Дальше идет бизнес-логика
// поймали событие, сделали что нужно

// Изменились элементы каталога
events.on<CatalogChangeEvent>('items:changed', () => {
	page.catalog = appData.catalog.map((item) => {
		const card = new Card(cloneTemplate(cardCatalogTemplate), {
			onClick: () => events.emit('card:select', item),
		});
		return card.render({
			title: item.title,
			image: item.image,
			description: item.description,
			category: item.category,
			price: item.price,
		});
	});

	page.counter = appData.basket?.length ?? 0;
});

// Переходим от формы заказа к форме контактов
events.on('order:submit', () => {
	modal.render({
		content: contacts.render({
			email: appData.order.email,
			phone: appData.order.phone,
			valid: false,
			errors: [],
		}),
	});
});

// Отправлена форма заказа
events.on('contacts:submit', () => {
	api
		.sendOrder(appData.order)
		.then((result) => {
			// так как данные успешно отправлены, то удаляем данные корзины
			appData.clearBasket();
			// открываем окно с оповещением об удачном заказе
			const success = new Success(cloneTemplate(successTemplate), {
				onClick: () => {
					modal.close();
				},
			});

			modal.render({
				content: success.render({ total: result.total }),
			});
		})
		.catch((err) => {
			console.error(err);
		});
});

// Изменилось состояние валидации формы
events.on('formErrors:change', (errors: Partial<IOrderForm>) => {
	const { address, email, phone } = errors;
	order.valid = !address;
	contacts.valid = !email && !phone;
	order.errors = Object.values({ address })
		.filter((i) => !!i)
		.join('; ');
	contacts.errors = Object.values({ phone, email })
		.filter((i) => !!i)
		.join('; ');
});

// Изменилось одно из полей заказа
events.on(
	/^order\..*:change/,
	(data: { field: keyof IOrderForm; value: string }) => {
		appData.setOrderField(data.field, data.value);
	}
);

// Изменилось одно из полей контактов
events.on(
	/^contacts\..*:change/,
	(data: { field: keyof IOrderForm; value: string }) => {
		appData.setOrderField(data.field, data.value);
	}
);

// Открыть форму заказа
events.on('order:open', () => {
	modal.render({
		content: order.render({
			payment: appData.order.payment,
			address: appData.order.address,
			valid: false,
			errors: [],
		}),
	});
});

events.on('order:change', () => {
	order.payment = appData.order.payment;
});

events.on('payment:change', (data: { payment: string }) => {
	appData.setPayment(data.payment);
});

// Открыть форму контактов
events.on('contacts:open', () => {
	modal.render({
		content: order.render({
			phone: '',
			email: '',
			valid: false,
			errors: [],
		}),
	});
});

// Открыть корзину
events.on('basket:open', () => {
	modal.render({
		content: createElement<HTMLElement>('div', {}, [
			basket.render({
				total: appData.getTotal(),
				selected: appData.order.items,
			}),
		]),
	});
});

// Изменения в корзине
events.on('basket:changed', () => {
	page.counter = appData.order.items.length;
	basket.items = appData.order.items.map((item) => {
		const card = new Card(cloneTemplate(cardBasketTemplate), {
			onClick: () => appData.toggleOrderedProduct(item, false),
		});
		const productData = appData.catalog.find((product) => product.id === item);
		return card.render({
			title: productData.title,
			price: productData.price,
			basketIndex: appData.order.items.indexOf(productData.id) + 1,
		});
	});
	basket.total = appData.getTotal();
	basket.selected = appData.order.items;
});

// Открыть лот
events.on('card:select', (item: IProduct) => {
	appData.setPreview(item);
});

events.on('preview:changed', (item: IProduct) => {
	const isInBasket = appData.order.items.includes(item.id);
	const isForSale = item.price > 0;
	const buttonText = isForSale
		? isInBasket
			? 'Убрать из корзины'
			: 'В корзину'
		: 'Не продается';

	const card = new Card(cloneTemplate(cardPreviewTemplate), {
		onClick: () => {
			if (isForSale) {
				appData.toggleOrderedProduct(item.id, !isInBasket);
				modal.close();
			}
		},
	});

	card.button = buttonText;
	modal.render({
		content: card.render({
			title: item.title,
			image: item.image,
			description: item.description,
			category: item.category,
			price: item.price,
		}),
	});
});

// Блокируем прокрутку страницы если открыта модалка
events.on('modal:open', () => {
	page.locked = true;
});

// ... и разблокируем
events.on('modal:close', () => {
	page.locked = false;
});

// Получаем лоты с сервера
api
	.getProducts()
	.then((data) => {
		appData.setCatalog(data);
		// Получаем из хранилища список лотов, добавленных в корзину ранее.
		// В дальнейшем можно добавить проверку, если ли этот товар на сервере и если
		// его убрали, то и из корзины и хранилища автоматически его убирать
		const orderItems = JSON.parse(localStorage.getItem('orderItems') || '[]');
		orderItems.forEach((item: string) => {
			appData.toggleOrderedProduct(item, true);
		});
	})
	.catch((err) => {
		console.error(err);
	});

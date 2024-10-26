import { IEvents } from './base/events';
import _ from 'lodash';

/**
 * Базовая модель, чтобы можно было отличить ее от простых объектов с данными
 */
export abstract class Model<T> {
	constructor(data: Partial<T>, protected events: IEvents) {
		Object.assign(this, data);
	}

	// Сообщить всем что модель поменялась
	emitChanges(event: string, payload?: object) {
		// Состав данных можно модифицировать
		this.events.emit(event, payload ?? {});
	}
}

export type CatalogChangeEvent = {
	catalog: IProduct[];
};

export class AppState extends Model<IAppState> {
	basket: string[];
	catalog: IProduct[];
	order: IOrder = {
		payment: 'card',
		address: '',
		email: '',
		phone: '',
		total: 0,
		items: [],
	};
	preview: string | null;
	formErrors: FormErrors = {};

	toggleOrderedProduct(id: string, isIncluded: boolean) {
		if (isIncluded) {
			this.order.items = _.uniq([...this.order.items, id]);
		} else {
			this.order.items = _.without(this.order.items, id);
		}
		this.order.total = this.getTotal();

		// Заношу список товаров корзины в локальное хранилище браузера, чтобы после
		// перезагрузки корзина не обнулялась
		localStorage.setItem('orderItems', JSON.stringify(this.order.items));

		this.emitChanges('basket:changed');
	}

	clearBasket() {
		this.order.items.forEach((id) => {
			this.toggleOrderedProduct(id, false);
		});
		this.order.payment = 'card';
		this.order.address = '';
		this.order.email = '';
		this.order.phone = '';
		this.order.total = this.getTotal();
	}

	getTotal() {
		return this.order.items.reduce(
			(a, c) => a + this.catalog.find((it) => it.id === c).price,
			0
		);
	}

	setCatalog(items: IProduct[]) {
		this.catalog = items;
		this.emitChanges('items:changed', { catalog: this.catalog });
	}

	setPreview(item: IProduct) {
		this.preview = item.id;
		this.emitChanges('preview:changed', item);
	}

	setPayment(value: string) {
		this.order.payment = value;
		this.emitChanges('order:change');
	}

	setOrderField(field: keyof IOrderForm, value: string) {
		this.order[field] = value;
		if (this.validateOrder()) {
			this.events.emit('order:ready', this.order);
		}
	}

	validateOrder() {
		const errors: typeof this.formErrors = {};

		// Проверка адреса
		if (!this.order.address) {
			errors.address = 'Необходимо указать адрес';
		}

		// Проверка email на корректность
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!this.order.email) {
			errors.email = 'Необходимо указать email';
		} else if (!emailRegex.test(this.order.email)) {
			errors.email = 'Некорректный формат email';
		}

		// Проверка телефона на содержимое (только цифры)
		const phoneRegex = /^\+?\d+$/;
		if (!this.order.phone) {
			errors.phone = 'Необходимо указать телефон';
		} else if (!phoneRegex.test(this.order.phone)) {
			errors.phone = 'Телефон должен содержать только цифры';
		}

		this.formErrors = errors;
		this.events.emit('formErrors:change', this.formErrors);

		return Object.keys(errors).length === 0;
	}
}

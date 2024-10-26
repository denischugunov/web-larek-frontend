// **
// Интерфейсы для АПИ
// **

// Интерфейс для API магазина
interface IShopApi {
	getProducts(): Promise<IProduct[]>;
	getProductItem(id: string): Promise<IProduct>;
	sendOrder(requestData: ISendRequest): Promise<ISendOrderResponse>;
}

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

// **
// Компоненты модели данных
// **

interface IAppState {
	catalog: IProduct[];
	basket: string[];
	preview: string | null;
	order: IOrder | null;
	loading: boolean;
}

// Модель товара
interface IProduct {
	id: string;
	description: string;
	image: string;
	title: string;
	category: string; // Используем enum для категории
	price: number | null; // Цена может быть числом или null
}

enum Category {
	soft = 'софт-скил',
	hard = 'хард-скил',
	button = 'кнопка',
	other = 'другое',
	additional = 'дополнительное',
}

interface IOrderForm {
	payment: string;
	address: string;
	email: string;
	phone: string;
}

interface IOrder extends IOrderForm {
	total: number;
	items: string[];
}

type FormErrors = Partial<Record<keyof IOrder, string>>;

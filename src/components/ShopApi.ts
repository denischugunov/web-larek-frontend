import { Api } from './base/api';

// Класс расширяет стандартный Api и позволяет получать и преобразовывать данные карточек, отдельной карточки, а также отправлять данные заказа
export class ShopApi extends Api implements IShopApi {
	private readonly cdn: string;

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
		let item = (await this.get(`/product/${id}`)) as IProduct;
		item = {
			...item,
			image: this.cdn + item.image,
		};
		return item;
	}

	async sendOrder(requestData: ISendRequest): Promise<ISendOrderResponse> {
		return (await this.post('/order', requestData)) as ISendOrderResponse;
	}
}

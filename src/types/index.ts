// Компоненты модели данных

// Модель (без класса, только интерфейс) товара

interface IProduct {
  id: string;
  description: string;
  image: string;
  title: string;
  category: Category; // Используем enum для категории
  price: number | null; // Цена может быть числом или null
}

enum Category {
  SoftSkill = "софт-скил",
  HardSkill = "хард-скил",
  Button = "кнопка",
  Another = "другое",
  Additional = "дополнительное",
}

// Модель продуктового листа

interface IProductList {
  total: number; // Общее количество товаров в списке
  items: IProduct[]; // Массив товаров

  // Методы
  getItems(): IProduct[]; // Метод для получения списка товаров
}

// Модель корзины

interface ICartItem {
  count: number; // Количество товаров в корзине
  item: IProduct; // Товар
}

interface ICart {
  total: number; // Итоговая цена корзины
  items: ICartItem[]; // Массив товаров с количеством

  // Методы
  addItem(item: IProduct): void; // Добавляет товар в корзину
  removeItem(itemId: string): void; // Убирает товар из корзины
  getTotalCost(): number; // Получение итоговой цены корзины
  getItemsList(): ICartItem[]; // Получение массива товаров с их количеством для дальнейшей работы с ним в заказе
  getItemCost(itemId: string): number; // Получение цены за товар (цена * количество)
}


// Модель заказа (orderData или orderModel)

type PaymentMethod = "Онлайн" | "При получении";

interface ISendOrderResponse {
  id: string; // Идентификатор заказа
  total: number; // Итоговая сумма заказа
}

interface IOrderData {
  payment: PaymentMethod; // Способ оплаты
  email: string; // Почта клиента
  phone: string; // Телефон клиента
  address: string; // Адрес доставки
  total: number; // Итоговая стоимость заказа
  items: string[]; // Массив ID товаров (как требуется сервером)

  // Методы
  addPayment(payment: string): void; // Добавляет способ оплаты
  addEmail(email: string): void; // Добавляет почту клиента
  addPhone(phone: string): void; // Добавляет телефон клиента
  addAddress(address: string): void; // Добавляет адрес клиента
  setTotal(total: number): void; // Устанавливает итоговую цену заказа
  setItems(items: string[]): void; // Устанавливает массив ID товаров
  sendOrder(): Promise<ISendOrderResponse>; // Отправка заказа
}

// ************************************************************************************************************

// Компоненты представления данных

// Представление карточки товара

interface IProductUI {
  productData: IProduct;
  template: HTMLElement;

  // Методы
  render(): void; // Метод рендеринга, который будет реализован в каждом виде карточки (с разными темплейтами)
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
  container: HTMLElement; // Контейнер, куда будут отрендерены карточки
  items: IProduct[]; // Массив товаров
  
  // Методы
  render(): void; // Метод рендеринга всех карточек в галерее главной страницы
}

// Представление корзины

interface IBasketUI {
  items: IProduct[];
  template: HTMLElement;

  // Методы
  render(): void; // Метод рендеринга информации о добавленных в корзину карточках
}

// Представление попапов формы оформления заказа

interface IOrderDataUI {
  // Методы
  render(): void; // Метод рендеринга попапа с формой заполнения
}

// На основании интерфейса IOrderDataUI будет создан класс OrderDataUI, который будет наследоваться 
// двумя классами OrderDataOrderUI и OrderDataContactsUI, каждый из них отвечает за свой попап с формой

// В таком случае, интерфейсы для классов конкретных попапов могут выглядеть так:

interface IOrderDataOrderUI extends IOrderDataUI {
    payment: PaymentMethod; // Способ оплаты
    email: string; // Почта клиента
}

interface IOrderDataContactsUI extends IOrderDataUI {
    phone: string; // Телефон клиента
    address: string; // Адрес доставки
}

// Представление попапа удачного оформления заказа

interface ISuccessUI {
  render(): void; // Метод рендеринга попапа с информацией об успешном оформлении заказа
}
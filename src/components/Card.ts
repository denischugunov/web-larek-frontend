import { Component } from './base/Component';
import { ensureElement } from '../utils/utils';

interface ICardActions {
	onClick: (event: MouseEvent) => void;
}

export interface ICard {
	title: string;
	description?: string | string[];
	image?: string;
	button?: string;
	price?: number | string;
	category?: string;
	basketIndex?: string | number;
}

export class Card extends Component<ICard> {
	protected _title: HTMLElement;
	protected _image?: HTMLImageElement;
	protected _description?: HTMLElement;
	protected _button?: HTMLButtonElement;
	protected _price?: HTMLElement;
	protected _category?: HTMLElement;
	protected _basketIndex?: HTMLElement;

	constructor(container: HTMLElement, actions?: ICardActions) {
		super(container);

		this._title = ensureElement<HTMLElement>('.card__title', container);
		this._image = container.querySelector('.card__image');
		this._button = container.querySelector('.card__button');
		this._description = container.querySelector('.card__text');
		this._price = container.querySelector('.card__price');
		this._category = container.querySelector('.card__category');
		this._basketIndex = container.querySelector('.basket__item-index')

		if (actions?.onClick) {
			if (this._button) {
				this._button.addEventListener('click', actions.onClick);
			} else {
				container.addEventListener('click', actions.onClick);
			}
		}
	}

	set id(value: string) {
		this.container.dataset.id = value;
	}

	get id(): string {
		return this.container.dataset.id || '';
	}

	set title(value: string) {
		this.setText(this._title, value);
	}

	get title(): string {
		return this._title.textContent || '';
	}

	set image(value: string) {
		this.setImage(this._image, value, this.title);
	}

	set description(value: string | string[]) {
		this.setText(this._description, value);
	}

	set category(value: string) {
		this.setText(this._category, value);

		let type: string;
		switch (value) {
			case 'софт-скил':
				type = '_soft';
				break;
			case 'хард-скил':
				type = '_hard';
				break;
			case 'другое':
				type = '_other';
				break;
			case 'дополнительное':
				type = '_additional';
				break;
			case 'кнопка':
				type = '_button';
		}
		this._category.className = '';
		this._category.classList.add('card__category', `card__category${type}`);
	}

	set price(value: string) {
		if (Number(value) === 0) {
			this.setText(this._price, 'Бесценно');
		} else {
			this.setText(this._price, `${value} синапсов`);
		}
	}

	set basketIndex(value: string | number) {
		this.setText(this._basketIndex, String(value))
	}

	set button(value: string) {
		this.setText(this._button, value);
		if (value === 'Не продается') this.setDisabled(this._button, true);
	}
}

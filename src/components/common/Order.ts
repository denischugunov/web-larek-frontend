import { ensureAllElements, ensureElement } from '../../utils/utils';
import { IEvents } from '../base/events';
import { Form } from '../Form';

export class Order extends Form<IOrderForm> {
	protected _buttons: HTMLButtonElement[];
	constructor(container: HTMLFormElement, events: IEvents) {
		super(container, events);
		const paymentButtonsContainer = ensureElement<HTMLDivElement>(
			'.order__buttons',
			this.container
		);
		this._buttons = ensureAllElements<HTMLButtonElement>(
			'.button',
			paymentButtonsContainer
		);

		this._buttons.forEach((button) => {
			button.addEventListener('click', () => {
				events.emit('payment:change', { payment: button.name });
			});
		});
	}

	set payment(name: string) {
		this._buttons.forEach((button) => {
			this.toggleClass(button, 'button_alt-active', button.name === name);
		});
	}

	set address(value: string) {
		(this.container.elements.namedItem('address') as HTMLInputElement).value =
			value;
	}
}

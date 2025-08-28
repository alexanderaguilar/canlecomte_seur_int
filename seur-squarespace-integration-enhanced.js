/**
 * 🚚 INTEGRACIÓN SEUR - SQUARESPACE ENHANCED
 * 
 * Archivo principal para integrar el calculador de envío SEUR en Squarespace.
 * Este archivo incluye todo lo necesario para funcionar de forma independiente.
 * 
 * @version 2.0.0
 * @author SEUR Integration Team
 */

// ==============================================================================
// CONFIGURACIÓN GLOBAL
// ==============================================================================

window.SEUR_CONFIG = {
    // Endpoint de la API Lambda
    endpoint: 'https://z788h4e4ed.execute-api.us-east-2.amazonaws.com/DeployProd',
    
    // Umbral para envío gratuito (en euros)
    freeShippingThreshold: 50.0,
    
    // Intervalo de actualización del carrito (ms)
    updateInterval: 2000,
    
    // Mostrar detalles de productos en el widget
    showProductDetails: true,
    
    // Mostrar detalles técnicos del envío
    showShippingDetails: true,
    
    // Posición del widget
    position: 'bottom-right',
    
    // Tema visual
    theme: 'light',
    
    // Idioma
    language: 'es',
    
    // Configuración de debugging
    debug: false
};

// ==============================================================================
// WIDGET FLOTANTE DE ENVÍO SEUR
// ==============================================================================

class SeurShippingWidget {
    constructor(config = {}) {
        this.config = { ...window.SEUR_CONFIG, ...config };
        this.state = {
            isExpanded: false,
            isCalculating: false,
            lastCalculation: null,
            cartData: null,
            shippingData: null,
            error: null
        };
        this.elements = {};
        this.init();
    }

    init() {
        try {
            this.createWidget();
            this.attachEventListeners();
            this.startCartMonitoring();
            console.log('[SEUR] Widget inicializado correctamente');
        } catch (error) {
            console.error('[SEUR] Error inicializando widget:', error);
        }
    }

    createWidget() {
        const widget = document.createElement('div');
        widget.className = 'seur-shipping-widget seur-widget-enter';
        widget.id = 'seur-shipping-widget';

        widget.innerHTML = `
            <div class="seur-widget-header" id="seur-widget-header">
                <div class="seur-widget-title">
                    <span class="seur-widget-icon">🚚</span>
                    <span>Envío SEUR</span>
                </div>
                <button class="seur-widget-toggle" id="seur-widget-toggle">▼</button>
            </div>
            
            <div class="seur-widget-content" id="seur-widget-content">
                <div class="seur-widget-body" id="seur-widget-body">
                    <div class="seur-widget-loading" id="seur-widget-loading">
                        <div class="seur-spinner"></div>
                        <div class="seur-loading-text">Calculando envío...</div>
                    </div>
                </div>
                
                <div class="seur-widget-footer">
                    <div class="seur-footer-text">
                        Powered by <span class="seur-footer-logo">SEUR</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(widget);

        this.elements.widget = widget;
        this.elements.header = widget.querySelector('#seur-widget-header');
        this.elements.content = widget.querySelector('#seur-widget-content');
        this.elements.body = widget.querySelector('#seur-widget-body');
        this.elements.toggle = widget.querySelector('#seur-widget-toggle');
        this.elements.loading = widget.querySelector('#seur-widget-loading');
    }

    attachEventListeners() {
        this.elements.header.addEventListener('click', () => this.toggleWidget());
        this.elements.toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleWidget();
        });

        document.addEventListener('click', (e) => {
            if (!this.elements.widget.contains(e.target)) {
                this.collapseWidget();
            }
        });
    }

    toggleWidget() {
        if (this.state.isExpanded) {
            this.collapseWidget();
        } else {
            this.expandWidget();
        }
    }

    expandWidget() {
        this.state.isExpanded = true;
        this.elements.content.classList.add('expanded');
        this.elements.toggle.textContent = '▲';
        this.elements.widget.classList.remove('minimized');
    }

    collapseWidget() {
        this.state.isExpanded = false;
        this.elements.content.classList.remove('expanded');
        this.elements.toggle.textContent = '▼';
        this.elements.widget.classList.add('minimized');
    }

    startCartMonitoring() {
        this.updateFromDOM();
        setInterval(() => this.updateFromDOM(), this.config.updateInterval);
    }

    updateFromDOM() {
        try {
            const cartData = this.extractCartDataFromDOM();
            if (cartData && this.hasCartChanged(cartData)) {
                this.handleCartUpdate(cartData);
            }
        } catch (error) {
            console.warn('[SEUR] Error actualizando desde DOM:', error);
        }
    }

    extractCartDataFromDOM() {
        const cartItems = [];
        const itemSelectors = [
            '.cart-item',
            '[data-cart-item]',
            '.sqs-cart-item',
            '.cart-product'
        ];

        itemSelectors.forEach(selector => {
            const items = document.querySelectorAll(selector);
            items.forEach(item => {
                const itemData = this.extractItemDataFromDOM(item);
                if (itemData) {
                    cartItems.push(itemData);
                }
            });
        });

        if (cartItems.length === 0) return null;

        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return {
            items: cartItems,
            total: total,
            itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
        };
    }

    extractItemDataFromDOM(itemElement) {
        try {
            const nameElement = itemElement.querySelector('.item-title, .cart-item-title, [data-item-title], .product-title');
            const priceElement = itemElement.querySelector('.item-price, .cart-item-price, [data-item-price], .product-price');
            const quantityElement = itemElement.querySelector('.item-quantity, .cart-item-quantity, [data-item-quantity], .product-quantity');

            if (!nameElement || !priceElement || !quantityElement) return null;

            const name = nameElement.textContent.trim();
            const price = parseFloat(priceElement.textContent.replace(/[^\d.,]/g, '').replace(',', '.'));
            const quantity = parseInt(quantityElement.textContent.trim());
            const sku = `ITEM-${Date.now()}`;

            if (isNaN(price) || isNaN(quantity)) return null;

            return {
                name,
                price,
                quantity,
                sku,
                productId: itemElement.dataset.productId || `PROD-${Date.now()}`
            };
        } catch (error) {
            console.warn('[SEUR] Error extrayendo datos de item:', error);
            return null;
        }
    }

    hasCartChanged(newCartData) {
        if (!this.state.cartData) return true;
        
        const oldCart = this.state.cartData;
        const newCart = newCartData;

        if (oldCart.itemCount !== newCart.itemCount) return true;
        if (Math.abs(oldCart.total - newCart.total) > 0.01) return true;
        if (oldCart.items.length !== newCart.items.length) return true;
        
        for (let i = 0; i < oldCart.items.length; i++) {
            const oldItem = oldCart.items[i];
            const newItem = newCart.items[i];
            
            if (oldItem.sku !== newItem.sku || 
                oldItem.quantity !== newItem.quantity ||
                Math.abs(oldItem.price - newItem.price) > 0.01) {
                return true;
            }
        }
        
        return false;
    }

    handleCartUpdate(cartData) {
        console.log('[SEUR] Carrito actualizado:', cartData);
        
        this.state.cartData = cartData;
        
        if (cartData.items.length === 0) {
            this.showEmptyCart();
        } else {
            this.calculateShipping(cartData);
        }
    }

    showEmptyCart() {
        this.elements.body.innerHTML = `
            <div class="seur-widget-loading">
                <div class="seur-widget-icon">🛒</div>
                <div class="seur-loading-text">Tu carrito está vacío</div>
                <div style="font-size: 11px; color: #6c757d; margin-top: 8px;">
                    Agrega productos para calcular el envío
                </div>
            </div>
        `;
        
        this.expandWidget();
    }

    async calculateShipping(cartData) {
        if (this.state.isCalculating) return;
        
        this.state.isCalculating = true;
        this.showCalculatingState();
        
        try {
            const requestData = {
                cart_items: cartData.items.map(item => ({
                    productId: item.productId,
                    sku: item.sku,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                shipping_address: this.getDefaultShippingAddress(),
                order_total: cartData.total
            };

            console.log('[SEUR] Calculando envío con datos:', requestData);

            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('[SEUR] Resultado del cálculo:', result);

            this.state.shippingData = result;
            this.state.lastCalculation = Date.now();
            
            if (result.success) {
                this.displayShippingResult(result, cartData);
            } else {
                this.displayShippingError(result.message || 'Error en el cálculo');
            }

        } catch (error) {
            console.error('[SEUR] Error calculando envío:', error);
            this.displayShippingError('Error de conexión. Usando cálculo local.');
            
            const fallbackResult = this.calculateFallbackShipping(cartData);
            this.displayShippingResult(fallbackResult, cartData);
        } finally {
            this.state.isCalculating = false;
        }
    }

    calculateFallbackShipping(cartData) {
        console.log('[SEUR] Usando cálculo de fallback');
        
        const baseShippingCost = 15.0;
        const weightCost = cartData.items.reduce((total, item) => {
            return total + (item.quantity * 1.0);
        }, 0) * 1.5;
        
        const shippingCost = baseShippingCost + weightCost;
        const isFree = cartData.total >= this.config.freeShippingThreshold;
        
        return {
            success: true,
            shipping_cost: isFree ? 0 : shippingCost,
            shipping_payment_required: !isFree,
            shipping_message: isFree 
                ? `¡Envío gratuito! Tu pedido supera los ${this.config.freeShippingThreshold}€`
                : `Envío con costo. Añade ${(this.config.freeShippingThreshold - cartData.total).toFixed(2)}€ más para envío gratuito`,
            calculation_method: "fallback",
            total_weight: cartData.items.reduce((total, item) => total + item.quantity, 0),
            parcels_count: 1
        };
    }

    showCalculatingState() {
        this.elements.loading.style.display = 'block';
        this.elements.body.innerHTML = `
            <div class="seur-widget-loading">
                <div class="seur-spinner"></div>
                <div class="seur-loading-text">Calculando envío con SEUR...</div>
            </div>
        `;
        
        this.expandWidget();
    }

    displayShippingResult(result, cartData) {
        const shippingCost = result.shipping_cost;
        const isFree = !result.shipping_payment_required;
        
        let html = `
            <div class="seur-shipping-info">
                <div class="seur-shipping-cost ${isFree ? 'free' : ''}">
                    <span class="seur-cost-label">Costo de envío:</span>
                    <span class="seur-cost-value ${isFree ? 'free' : 'paid'}">
                        ${isFree ? 'GRATIS' : `${shippingCost.toFixed(2)}€`}
                    </span>
                </div>
        `;

        if (isFree) {
            html += `
                <div class="seur-free-shipping-message">
                    <span class="seur-free-shipping-icon">🎉</span>
                    ${result.shipping_message}
                </div>
            `;
        } else {
            const remaining = this.config.freeShippingThreshold - cartData.total;
            html += `
                <div class="seur-motivational-message">
                    Añade <span class="seur-remaining-amount">${remaining.toFixed(2)}€</span> más para envío gratuito
                </div>
            `;
        }

        if (this.config.showShippingDetails && result.total_weight) {
            html += `
                <div class="seur-shipping-details">
                    <div class="seur-detail-row">
                        <span class="seur-detail-label">Peso total:</span>
                        <span class="seur-detail-value">${result.total_weight}kg</span>
                    </div>
                    <div class="seur-detail-row">
                        <span class="seur-detail-label">Bultos:</span>
                        <span class="seur-detail-value">${result.parcels_count}</span>
                    </div>
                    <div class="seur-detail-row">
                        <span class="seur-detail-label">Método:</span>
                        <span class="seur-detail-value">${result.calculation_method}</span>
                    </div>
                </div>
            `;
        }

        if (this.config.showProductDetails) {
            html += `
                <div class="seur-cart-items">
                    <div style="font-size: 12px; color: #6c757d; margin-bottom: 8px; font-weight: 600;">
                        Productos en el carrito:
                    </div>
            `;
            
            cartData.items.forEach(item => {
                html += `
                    <div class="seur-cart-item">
                        <div class="seur-item-icon">📦</div>
                        <div class="seur-item-details">
                            <div class="seur-item-name">${item.name}</div>
                            <div class="seur-item-info">
                                <span>${item.price.toFixed(2)}€</span>
                                <span class="seur-item-quantity">x${item.quantity}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }

        html += `
            <button class="seur-recalculate-btn" id="seur-recalculate-btn">
                🔄 Recalcular Envío
            </button>
        `;

        this.elements.body.innerHTML = html;
        this.elements.loading.style.display = 'none';

        const recalcBtn = this.elements.body.querySelector('#seur-recalculate-btn');
        if (recalcBtn) {
            recalcBtn.addEventListener('click', () => {
                this.calculateShipping(cartData);
            });
        }

        this.elements.body.classList.add('seur-success-animation');
        setTimeout(() => {
            this.elements.body.classList.remove('seur-success-animation');
        }, 600);
    }

    displayShippingError(message) {
        this.elements.body.innerHTML = `
            <div class="seur-widget-error">
                <div class="seur-error-icon">⚠️</div>
                <div class="seur-error-message">${message}</div>
            </div>
            <button class="seur-recalculate-btn" id="seur-recalculate-btn">
                🔄 Reintentar
            </button>
        `;
        
        this.elements.loading.style.display = 'none';

        const retryBtn = this.elements.body.querySelector('#seur-recalculate-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (this.state.cartData) {
                    this.calculateShipping(this.state.cartData);
                }
            });
        }
    }

    getDefaultShippingAddress() {
        return {
            countryCode: 'ES',
            city: '',
            postalCode: ''
        };
    }

    destroy() {
        if (this.elements.widget && this.elements.widget.parentNode) {
            this.elements.widget.parentNode.removeChild(this.elements.widget);
        }
    }
}

// ==============================================================================
// INYECCIÓN DE ESTILOS CSS
// ==============================================================================

function injectSeurStyles() {
    const styles = `
        :root {
            --seur-primary-color: #0066cc;
            --seur-secondary-color: #004499;
            --seur-success-color: #28a745;
            --seur-warning-color: #ffc107;
            --seur-danger-color: #dc3545;
            --seur-light-color: #f8f9fa;
            --seur-dark-color: #343a40;
            --seur-border-radius: 12px;
            --seur-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            --seur-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .seur-shipping-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            max-width: calc(100vw - 40px);
            background: white;
            border-radius: var(--seur-border-radius);
            box-shadow: var(--seur-shadow);
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            transition: var(--seur-transition);
            transform: translateY(0);
        }

        .seur-shipping-widget:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .seur-widget-header {
            background: linear-gradient(135deg, var(--seur-primary-color), var(--seur-secondary-color));
            color: white;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            user-select: none;
        }

        .seur-widget-header:hover {
            background: linear-gradient(135deg, var(--seur-secondary-color), var(--seur-primary-color));
        }

        .seur-widget-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 14px;
        }

        .seur-widget-icon {
            font-size: 18px;
            animation: seur-bounce 2s infinite;
        }

        @keyframes seur-bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-3px); }
            60% { transform: translateY(-2px); }
        }

        .seur-widget-toggle {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: var(--seur-transition);
            font-size: 12px;
        }

        .seur-widget-toggle:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(180deg);
        }

        .seur-widget-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-in-out;
        }

        .seur-widget-content.expanded {
            max-height: 500px;
        }

        .seur-widget-body {
            padding: 20px;
        }

        .seur-widget-loading {
            text-align: center;
            padding: 20px;
            color: var(--seur-dark-color);
        }

        .seur-widget-loading .seur-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid var(--seur-light-color);
            border-top: 2px solid var(--seur-primary-color);
            border-radius: 50%;
            animation: seur-spin 1s linear infinite;
            margin-bottom: 12px;
        }

        @keyframes seur-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .seur-widget-loading .seur-loading-text {
            font-size: 13px;
            color: var(--seur-dark-color);
        }

        .seur-shipping-info {
            margin-bottom: 16px;
        }

        .seur-shipping-cost {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 12px;
            background: var(--seur-light-color);
            border-radius: 8px;
            border-left: 4px solid var(--seur-primary-color);
        }

        .seur-shipping-cost.free {
            border-left-color: var(--seur-success-color);
            background: #d4edda;
        }

        .seur-cost-label {
            font-size: 13px;
            color: var(--seur-dark-color);
            font-weight: 500;
        }

        .seur-cost-value {
            font-size: 16px;
            font-weight: 700;
            color: var(--seur-primary-color);
        }

        .seur-cost-value.free {
            color: var(--seur-success-color);
        }

        .seur-cost-value.paid {
            color: var(--seur-danger-color);
        }

        .seur-free-shipping-message {
            background: linear-gradient(135deg, var(--seur-success-color), #20c997);
            color: white;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 12px;
            animation: seur-pulse 2s infinite;
        }

        @keyframes seur-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }

        .seur-free-shipping-icon {
            margin-right: 6px;
            font-size: 14px;
        }

        .seur-motivational-message {
            background: var(--seur-warning-color);
            color: var(--seur-dark-color);
            padding: 10px 12px;
            border-radius: 6px;
            font-size: 12px;
            text-align: center;
            margin-bottom: 12px;
            border-left: 3px solid #e0a800;
        }

        .seur-remaining-amount {
            font-weight: 700;
            color: var(--seur-primary-color);
        }

        .seur-shipping-details {
            background: var(--seur-light-color);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 16px;
        }

        .seur-detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 12px;
        }

        .seur-detail-row:last-child {
            margin-bottom: 0;
        }

        .seur-detail-label {
            color: var(--seur-dark-color);
            font-weight: 500;
        }

        .seur-detail-value {
            color: var(--seur-primary-color);
            font-weight: 600;
        }

        .seur-cart-items {
            margin-bottom: 16px;
        }

        .seur-cart-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }

        .seur-cart-item:last-child {
            border-bottom: none;
        }

        .seur-item-icon {
            width: 32px;
            height: 32px;
            background: var(--seur-primary-color);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            margin-right: 12px;
            flex-shrink: 0;
        }

        .seur-item-details {
            flex: 1;
            min-width: 0;
        }

        .seur-item-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--seur-dark-color);
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .seur-item-info {
            font-size: 11px;
            color: #6c757d;
            display: flex;
            gap: 8px;
        }

        .seur-item-quantity {
            background: var(--seur-primary-color);
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
        }

        .seur-widget-error {
            background: var(--seur-danger-color);
            color: white;
            padding: 16px;
            text-align: center;
            border-radius: 8px;
            margin: 16px 0;
        }

        .seur-error-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }

        .seur-error-message {
            font-size: 13px;
            line-height: 1.4;
        }

        .seur-recalculate-btn {
            width: 100%;
            background: var(--seur-primary-color);
            color: white;
            border: none;
            padding: 12px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--seur-transition);
            margin-top: 8px;
        }

        .seur-recalculate-btn:hover {
            background: var(--seur-secondary-color);
            transform: translateY(-1px);
        }

        .seur-recalculate-btn:active {
            transform: translateY(0);
        }

        .seur-widget-footer {
            background: var(--seur-light-color);
            padding: 12px 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }

        .seur-footer-text {
            font-size: 11px;
            color: #6c757d;
        }

        .seur-footer-logo {
            color: var(--seur-primary-color);
            font-weight: 600;
        }

        .seur-widget.minimized .seur-widget-content {
            max-height: 0;
        }

        .seur-widget.minimized .seur-widget-toggle {
            transform: rotate(0deg);
        }

        .seur-widget-enter {
            animation: seur-slideIn 0.3s ease-out;
        }

        @keyframes seur-slideIn {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .seur-success-animation {
            animation: seur-successPulse 0.6s ease-out;
        }

        @keyframes seur-successPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        @media (max-width: 768px) {
            .seur-shipping-widget {
                bottom: 10px;
                right: 10px;
                left: 10px;
                width: auto;
                max-width: none;
            }
        }

        @media (max-width: 480px) {
            .seur-shipping-widget {
                bottom: 5px;
                right: 5px;
                left: 5px;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// ==============================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==============================================================================

function initializeSeurIntegration() {
    try {
        // Inyectar estilos
        injectSeurStyles();
        
        // Crear widget
        const widget = new SeurShippingWidget();
        
        // Guardar referencia global
        window.seurWidget = widget;
        
        console.log('[SEUR] Integración inicializada correctamente');
        
        return widget;
    } catch (error) {
        console.error('[SEUR] Error inicializando integración:', error);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSeurIntegration);
} else {
    initializeSeurIntegration();
}

// Función global para acceso manual
window.initializeSeurShipping = initializeSeurIntegration;

/**
 * 🚚 WIDGET FLOTANTE DE ENVÍO SEUR - SQUARESPACE INTEGRATION
 * 
 * Widget moderno y responsive que se integra con el carrito de Squarespace
 * para mostrar cálculos de envío en tiempo real usando la API de SEUR.
 * 
 * @version 2.0.0
 * @author SEUR Integration Team
 */

class SeurShippingWidget {
    constructor(config = {}) {
        // Configuración por defecto
        this.config = {
            endpoint: config.endpoint || 'https://z788h4e4ed.execute-api.us-east-2.amazonaws.com/DeployProd',
            freeShippingThreshold: config.freeShippingThreshold || 50.0,
            updateInterval: config.updateInterval || 2000,
            showProductDetails: config.showProductDetails !== false,
            showShippingDetails: config.showShippingDetails !== false,
            position: config.position || 'bottom-right',
            theme: config.theme || 'light',
            language: config.language || 'es',
            ...config
        };

        // Estado del widget
        this.state = {
            isExpanded: false,
            isCalculating: false,
            lastCalculation: null,
            cartData: null,
            shippingData: null,
            error: null,
            updateTimer: null
        };

        // Referencias al DOM
        this.elements = {};

        // Inicializar
        this.init();
    }

    /**
     * Inicializa el widget
     */
    init() {
        try {
            this.createWidget();
            this.attachEventListeners();
            this.startCartMonitoring();
            this.showNotification('Widget SEUR inicializado', 'success');
        } catch (error) {
            console.error('Error inicializando widget SEUR:', error);
            this.showNotification('Error inicializando widget', 'error');
        }
    }

    /**
     * Crea el HTML del widget
     */
    createWidget() {
        // Crear contenedor principal
        const widget = document.createElement('div');
        widget.className = 'seur-shipping-widget seur-widget-enter';
        widget.id = 'seur-shipping-widget';

        // HTML del widget
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

        // Agregar al DOM
        document.body.appendChild(widget);

        // Guardar referencias
        this.elements.widget = widget;
        this.elements.header = widget.querySelector('#seur-widget-header');
        this.elements.content = widget.querySelector('#seur-widget-content');
        this.elements.body = widget.querySelector('#seur-widget-body');
        this.elements.toggle = widget.querySelector('#seur-widget-toggle');
        this.elements.loading = widget.querySelector('#seur-widget-loading');
    }

    /**
     * Adjunta event listeners
     */
    attachEventListeners() {
        // Toggle del widget
        this.elements.header.addEventListener('click', () => {
            this.toggleWidget();
        });

        // Click en el botón de toggle (evitar doble evento)
        this.elements.toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleWidget();
        });

        // Click fuera del widget para cerrar
        document.addEventListener('click', (e) => {
            if (!this.elements.widget.contains(e.target)) {
                this.collapseWidget();
            }
        });

        // Escuchar cambios en el carrito de Squarespace
        this.listenToSquarespaceEvents();
    }

    /**
     * Escucha eventos de Squarespace
     */
    listenToSquarespaceEvents() {
        // Eventos del carrito de Squarespace
        if (window.Squarespace && window.Squarespace.Commerce) {
            // Cambios en el carrito
            window.Squarespace.Commerce.on('cart:update', (cartData) => {
                this.handleCartUpdate(cartData);
            });

            // Producto agregado
            window.Squarespace.Commerce.on('cart:item:add', (itemData) => {
                this.handleProductAdded(itemData);
            });

            // Producto removido
            window.Squarespace.Commerce.on('cart:item:remove', (itemData) => {
                this.handleProductRemoved(itemData);
            });

            // Cambios en cantidad
            window.Squarespace.Commerce.on('cart:item:quantity:change', (itemData) => {
                this.handleQuantityChange(itemData);
            });
        }

        // Fallback: escuchar cambios en el DOM
        this.observeCartChanges();
    }

    /**
     * Observa cambios en el carrito como fallback
     */
    observeCartChanges() {
        // Observar cambios en elementos del carrito
        const cartSelectors = [
            '.cart-item',
            '.cart-count',
            '.cart-total',
            '[data-cart-item]',
            '.sqs-cart-quantity'
        ];

        cartSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                this.observeElement(element);
            });
        });

        // Observar nuevos elementos agregados
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.matches && cartSelectors.some(selector => node.matches(selector))) {
                            this.observeElement(node);
                        }
                        // Buscar en nodos hijos
                        cartSelectors.forEach(selector => {
                            const children = node.querySelectorAll(selector);
                            children.forEach(child => this.observeElement(child));
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Observa un elemento específico
     */
    observeElement(element) {
        if (!element || element._seurObserved) return;
        
        element._seurObserved = true;
        
        // Observar cambios en atributos
        const attrObserver = new MutationObserver(() => {
            this.detectCartChanges();
        });
        
        attrObserver.observe(element, {
            attributes: true,
            attributeFilter: ['data-quantity', 'data-price', 'class']
        });
    }

    /**
     * Detecta cambios en el carrito
     */
    detectCartChanges() {
        if (this.state.updateTimer) {
            clearTimeout(this.state.updateTimer);
        }
        
        this.state.updateTimer = setTimeout(() => {
            this.updateFromDOM();
        }, 500);
    }

    /**
     * Actualiza datos desde el DOM
     */
    updateFromDOM() {
        try {
            const cartData = this.extractCartDataFromDOM();
            if (cartData && this.hasCartChanged(cartData)) {
                this.handleCartUpdate(cartData);
            }
        } catch (error) {
            console.warn('Error extrayendo datos del carrito desde DOM:', error);
        }
    }

    /**
     * Extrae datos del carrito desde el DOM
     */
    extractCartDataFromDOM() {
        const cartItems = [];
        const itemSelectors = [
            '.cart-item',
            '[data-cart-item]',
            '.sqs-cart-item'
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

        // Calcular total
        const total = cartItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        return {
            items: cartItems,
            total: total,
            itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
        };
    }

    /**
     * Extrae datos de un item desde el DOM
     */
    extractItemDataFromDOM(itemElement) {
        try {
            // Buscar información del producto
            const nameElement = itemElement.querySelector('.item-title, .cart-item-title, [data-item-title]');
            const priceElement = itemElement.querySelector('.item-price, .cart-item-price, [data-item-price]');
            const quantityElement = itemElement.querySelector('.item-quantity, .cart-item-quantity, [data-item-quantity]');
            const skuElement = itemElement.querySelector('.item-sku, .cart-item-sku, [data-item-sku]');

            if (!nameElement || !priceElement || !quantityElement) return null;

            const name = nameElement.textContent.trim();
            const price = parseFloat(priceElement.textContent.replace(/[^\d.,]/g, '').replace(',', '.'));
            const quantity = parseInt(quantityElement.textContent.trim());
            const sku = skuElement ? skuElement.textContent.trim() : `ITEM-${Date.now()}`;

            if (isNaN(price) || isNaN(quantity)) return null;

            return {
                name,
                price,
                quantity,
                sku,
                productId: itemElement.dataset.productId || `PROD-${Date.now()}`
            };
        } catch (error) {
            console.warn('Error extrayendo datos de item:', error);
            return null;
        }
    }

    /**
     * Verifica si el carrito ha cambiado
     */
    hasCartChanged(newCartData) {
        if (!this.state.cartData) return true;
        
        const oldCart = this.state.cartData;
        const newCart = newCartData;

        // Verificar número de items
        if (oldCart.itemCount !== newCart.itemCount) return true;
        
        // Verificar total
        if (Math.abs(oldCart.total - newCart.total) > 0.01) return true;
        
        // Verificar items individuales
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

    /**
     * Maneja actualización del carrito
     */
    handleCartUpdate(cartData) {
        console.log('Carrito actualizado:', cartData);
        
        this.state.cartData = cartData;
        
        if (cartData.items.length === 0) {
            this.showEmptyCart();
        } else {
            this.calculateShipping(cartData);
        }
    }

    /**
     * Maneja producto agregado
     */
    handleProductAdded(itemData) {
        console.log('Producto agregado:', itemData);
        
        // Mostrar indicador visual
        this.showProductAddedIndicator();
        
        // Actualizar carrito
        this.updateFromDOM();
    }

    /**
     * Maneja producto removido
     */
    handleProductRemoved(itemData) {
        console.log('Producto removido:', itemData);
        
        // Actualizar carrito
        this.updateFromDOM();
    }

    /**
     * Maneja cambio en cantidad
     */
    handleQuantityChange(itemData) {
        console.log('Cantidad cambiada:', itemData);
        
        // Actualizar carrito
        this.updateFromDOM();
    }

    /**
     * Muestra indicador de producto agregado
     */
    showProductAddedIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'seur-product-added';
        indicator.textContent = '✓';
        
        this.elements.widget.appendChild(indicator);
        
        // Remover después de la animación
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
    }

    /**
     * Muestra carrito vacío
     */
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

    /**
     * Calcula el envío
     */
    async calculateShipping(cartData) {
        if (this.state.isCalculating) return;
        
        this.state.isCalculating = true;
        this.showCalculatingState();
        
        try {
            // Preparar datos para la API
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

            console.log('Calculando envío con datos:', requestData);

            // Llamar a la API
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
            console.log('Resultado del cálculo:', result);

            this.state.shippingData = result;
            this.state.lastCalculation = Date.now();
            
            if (result.success) {
                this.displayShippingResult(result, cartData);
            } else {
                this.displayShippingError(result.message || 'Error en el cálculo');
            }

        } catch (error) {
            console.error('Error calculando envío:', error);
            this.displayShippingError('Error de conexión. Usando cálculo local.');
            
            // Fallback a cálculo local
            const fallbackResult = this.calculateFallbackShipping(cartData);
            this.displayShippingResult(fallbackResult, cartData);
        } finally {
            this.state.isCalculating = false;
        }
    }

    /**
     * Cálculo de fallback
     */
    calculateFallbackShipping(cartData) {
        console.log('Usando cálculo de fallback');
        
        const baseShippingCost = 15.0;
        const weightCost = cartData.items.reduce((total, item) => {
            return total + (item.quantity * 1.0); // Peso estimado por item
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

    /**
     * Muestra estado de cálculo
     */
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

    /**
     * Muestra resultado del envío
     */
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

        // Mensaje de envío gratuito
        if (isFree) {
            html += `
                <div class="seur-free-shipping-message">
                    <span class="seur-free-shipping-icon">🎉</span>
                    ${result.shipping_message}
                </div>
            `;
        } else {
            // Mensaje motivacional
            const remaining = this.config.freeShippingThreshold - cartData.total;
            html += `
                <div class="seur-motivational-message">
                    Añade <span class="seur-remaining-amount">${remaining.toFixed(2)}€</span> más para envío gratuito
                </div>
            `;
        }

        // Detalles del envío
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

        // Productos en el carrito
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

        // Botón de recálculo
        html += `
            <button class="seur-recalculate-btn" id="seur-recalculate-btn">
                🔄 Recalcular Envío
            </button>
        `;

        this.elements.body.innerHTML = html;
        this.elements.loading.style.display = 'none';

        // Adjuntar event listener al botón
        const recalcBtn = this.elements.body.querySelector('#seur-recalculate-btn');
        if (recalcBtn) {
            recalcBtn.addEventListener('click', () => {
                this.calculateShipping(cartData);
            });
        }

        // Animación de éxito
        this.elements.body.classList.add('seur-success-animation');
        setTimeout(() => {
            this.elements.body.classList.remove('seur-success-animation');
        }, 600);
    }

    /**
     * Muestra error de envío
     */
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

        // Adjuntar event listener al botón
        const retryBtn = this.elements.body.querySelector('#seur-recalculate-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                if (this.state.cartData) {
                    this.calculateShipping(this.state.cartData);
                }
            });
        }
    }

    /**
     * Obtiene dirección de envío por defecto
     */
    getDefaultShippingAddress() {
        return {
            countryCode: 'ES',
            city: '',
            postalCode: ''
        };
    }

    /**
     * Alterna el estado del widget
     */
    toggleWidget() {
        if (this.state.isExpanded) {
            this.collapseWidget();
        } else {
            this.expandWidget();
        }
    }

    /**
     * Expande el widget
     */
    expandWidget() {
        this.state.isExpanded = true;
        this.elements.content.classList.add('expanded');
        this.elements.toggle.textContent = '▲';
        this.elements.widget.classList.remove('minimized');
    }

    /**
     * Colapsa el widget
     */
    collapseWidget() {
        this.state.isExpanded = false;
        this.elements.content.classList.remove('expanded');
        this.elements.toggle.textContent = '▼';
        this.elements.widget.classList.add('minimized');
    }

    /**
     * Inicia monitoreo del carrito
     */
    startCartMonitoring() {
        // Monitoreo inicial
        this.updateFromDOM();
        
        // Monitoreo periódico
        setInterval(() => {
            this.updateFromDOM();
        }, this.config.updateInterval);
    }

    /**
     * Muestra notificación
     */
    showNotification(message, type = 'info') {
        console.log(`[SEUR Widget] ${message}`);
        
        // Aquí podrías implementar notificaciones visuales más elaboradas
        if (type === 'error') {
            console.error(`[SEUR Widget] ${message}`);
        }
    }

    /**
     * Destruye el widget
     */
    destroy() {
        if (this.state.updateTimer) {
            clearTimeout(this.state.updateTimer);
        }
        
        if (this.elements.widget && this.elements.widget.parentNode) {
            this.elements.widget.parentNode.removeChild(this.elements.widget);
        }
    }

    /**
     * Actualiza configuración
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('Configuración actualizada:', this.config);
    }

    /**
     * Obtiene estado actual
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Fuerza recálculo
     */
    forceRecalculation() {
        if (this.state.cartData) {
            this.calculateShipping(this.state.cartData);
        }
    }
}

// ==============================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==============================================================================

// Función de inicialización global
window.initializeSeurShippingWidget = function(config = {}) {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.seurShippingWidget = new SeurShippingWidget(config);
        });
    } else {
        window.seurShippingWidget = new SeurShippingWidget(config);
    }
};

// Auto-inicialización con configuración por defecto
if (typeof window !== 'undefined') {
    // Configuración por defecto
    const defaultConfig = {
        endpoint: 'https://z788h4e4ed.execute-api.us-east-2.amazonaws.com/DeployProd',
        freeShippingThreshold: 50.0,
        updateInterval: 2000,
        showProductDetails: true,
        showShippingDetails: true,
        position: 'bottom-right',
        theme: 'light',
        language: 'es'
    };

    // Inicializar automáticamente
    window.initializeSeurShippingWidget(defaultConfig);
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SeurShippingWidget;
}

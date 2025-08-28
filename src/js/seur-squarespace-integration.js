/**
 * 🚚 INTEGRACIÓN PRINCIPAL SEUR - SQUARESPACE
 * 
 * Este archivo es el punto de entrada principal para la integración
 * de SEUR con Squarespace. Carga el widget y maneja la integración
 * con el sistema de carrito de Squarespace.
 * 
 * @version 2.0.0
 * @author SEUR Integration Team
 */

// ==============================================================================
// CONFIGURACIÓN GLOBAL
// ==============================================================================

// Configuración por defecto de la integración
window.SEUR_INTEGRATION_CONFIG = {
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
    
    // Configuración de SEUR
    seur: {
        // Unidades preferidas para SEUR
        preferredWeightUnit: 'KILOGRAM',
        preferredDimensionUnit: 'CENTIMETER',
        
        // Factor volumétrico
        volumetricFactor: 5000,
        
        // Categorías de productos excluidas del envío
        excludedCategories: [
            'digital_products',
            'virtual_services',
            'subscriptions',
            'downloads',
            'online_courses',
            'webinars',
            'templates',
            'licenses'
        ],
        
        // SKUs específicos excluidos
        excludedSkus: [
            'DIGITAL-001',
            'SERVICE-001',
            'SUBSCRIPTION-001'
        ]
    },
    
    // Configuración de Squarespace
    squarespace: {
        // Selectores para detectar cambios en el carrito
        cartSelectors: [
            '.cart-item',
            '.cart-count',
            '.cart-total',
            '[data-cart-item]',
            '.sqs-cart-quantity',
            '.cart-summary',
            '.order-summary'
        ],
        
        // Selectores para productos individuales
        productSelectors: [
            '.item-title',
            '.cart-item-title',
            '[data-item-title]',
            '.product-title'
        ],
        
        // Selectores para precios
        priceSelectors: [
            '.item-price',
            '.cart-item-price',
            '[data-item-price]',
            '.product-price'
        ],
        
        // Selectores para cantidades
        quantitySelectors: [
            '.item-quantity',
            '.cart-item-quantity',
            '[data-item-quantity]',
            '.product-quantity'
        ],
        
        // Selectores para SKUs
        skuSelectors: [
            '.item-sku',
            '.cart-item-sku',
            '[data-item-sku]',
            '.product-sku'
        ]
    },
    
    // Configuración de notificaciones
    notifications: {
        enabled: true,
        position: 'top-right',
        duration: 5000,
        showSuccess: true,
        showError: true,
        showInfo: true
    },
    
    // Configuración de debugging
    debug: {
        enabled: false,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        showTimestamps: true,
        logToConsole: true
    }
};

// ==============================================================================
// SISTEMA DE LOGGING
// ==============================================================================

class SeurLogger {
    constructor(config) {
        this.config = config;
        this.logLevels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
    }

    log(level, message, data = null) {
        if (!this.config.enabled) return;
        
        const currentLevel = this.logLevels[this.config.logLevel] || 1;
        const messageLevel = this.logLevels[level] || 1;
        
        if (messageLevel < currentLevel) return;
        
        const timestamp = this.config.showTimestamps ? `[${new Date().toISOString()}]` : '';
        const prefix = `[SEUR Integration]${timestamp}`;
        
        if (this.config.logToConsole) {
            switch (level) {
                case 'debug':
                    console.log(`${prefix} 🔍 ${message}`, data);
                    break;
                case 'info':
                    console.log(`${prefix} ℹ️ ${message}`, data);
                    break;
                case 'warn':
                    console.warn(`${prefix} ⚠️ ${message}`, data);
                    break;
                case 'error':
                    console.error(`${prefix} ❌ ${message}`, data);
                    break;
            }
        }
    }

    debug(message, data) { this.log('debug', message, data); }
    info(message, data) { this.log('info', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    error(message, data) { this.log('error', message, data); }
}

// ==============================================================================
// SISTEMA DE NOTIFICACIONES
// ==============================================================================

class SeurNotificationManager {
    constructor(config) {
        this.config = config;
        this.notifications = [];
        this.init();
    }

    init() {
        if (!this.config.enabled) return;
        
        // Crear contenedor de notificaciones
        this.container = document.createElement('div');
        this.container.id = 'seur-notifications-container';
        this.container.className = `seur-notifications seur-notifications-${this.config.position}`;
        document.body.appendChild(this.container);
        
        // Agregar estilos
        this.injectNotificationStyles();
    }

    injectNotificationStyles() {
        const styles = `
            .seur-notifications {
                position: fixed;
                z-index: 10000;
                pointer-events: none;
            }
            
            .seur-notifications-top-right {
                top: 20px;
                right: 20px;
            }
            
            .seur-notifications-top-left {
                top: 20px;
                left: 20px;
            }
            
            .seur-notifications-bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .seur-notifications-bottom-left {
                bottom: 20px;
                left: 20px;
            }
            
            .seur-notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                padding: 16px;
                min-width: 300px;
                max-width: 400px;
                pointer-events: auto;
                animation: seur-notification-slideIn 0.3s ease-out;
                border-left: 4px solid #0066cc;
            }
            
            .seur-notification.success {
                border-left-color: #28a745;
            }
            
            .seur-notification.error {
                border-left-color: #dc3545;
            }
            
            .seur-notification.info {
                border-left-color: #17a2b8;
            }
            
            .seur-notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .seur-notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
            }
            
            .seur-notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .seur-notification-close:hover {
                color: #666;
            }
            
            .seur-notification-message {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
            }
            
            @keyframes seur-notification-slideIn {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes seur-notification-slideOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    show(message, type = 'info', title = null) {
        if (!this.config.enabled || !this.container) return;
        
        const notification = document.createElement('div');
        notification.className = `seur-notification ${type}`;
        
        const icon = this.getIconForType(type);
        const defaultTitle = this.getDefaultTitleForType(type);
        
        notification.innerHTML = `
            <div class="seur-notification-header">
                <div class="seur-notification-title">
                    ${icon} ${title || defaultTitle}
                </div>
                <button class="seur-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="seur-notification-message">${message}</div>
        `;
        
        this.container.appendChild(notification);
        
        // Auto-remover después del tiempo configurado
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'seur-notification-slideOut 0.3s ease-out';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, this.config.duration);
        
        return notification;
    }

    getIconForType(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            case 'warn': return '⚠️';
            default: return 'ℹ️';
        }
    }

    getDefaultTitleForType(type) {
        switch (type) {
            case 'success': return 'Éxito';
            case 'error': return 'Error';
            case 'info': return 'Información';
            case 'warn': return 'Advertencia';
            default: return 'Notificación';
        }
    }

    success(message, title) { return this.show(message, 'success', title); }
    error(message, title) { return this.show(message, 'error', title); }
    info(message, title) { return this.show(message, 'info', title); }
    warn(message, title) { return this.show(message, 'warn', title); }
}

// ==============================================================================
// INTEGRADOR PRINCIPAL DE SQUARESPACE
// ==============================================================================

class SeurSquarespaceIntegrator {
    constructor(config = {}) {
        this.config = { ...window.SEUR_INTEGRATION_CONFIG, ...config };
        this.logger = new SeurLogger(this.config.debug);
        this.notifications = new SeurNotificationManager(this.config.notifications);
        this.widget = null;
        this.isInitialized = false;
        this.cartObserver = null;
        this.lastCartState = null;
        
        this.logger.info('Integrador SEUR-Squarespace inicializado', this.config);
    }

    /**
     * Inicializa la integración completa
     */
    async init() {
        try {
            this.logger.info('Iniciando integración SEUR-Squarespace...');
            
            // Esperar a que Squarespace esté listo
            await this.waitForSquarespace();
            
            // Inicializar widget
            await this.initWidget();
            
            // Configurar monitoreo del carrito
            this.setupCartMonitoring();
            
            // Configurar eventos de Squarespace
            this.setupSquarespaceEvents();
            
            this.isInitialized = true;
            this.logger.info('Integración SEUR-Squarespace completada exitosamente');
            this.notifications.success('Integración SEUR inicializada correctamente');
            
        } catch (error) {
            this.logger.error('Error inicializando integración SEUR-Squarespace', error);
            this.notifications.error('Error inicializando integración SEUR');
        }
    }

    /**
     * Espera a que Squarespace esté disponible
     */
    async waitForSquarespace() {
        return new Promise((resolve) => {
            if (window.Squarespace && window.Squarespace.Commerce) {
                resolve();
                return;
            }
            
            const checkInterval = setInterval(() => {
                if (window.Squarespace && window.Squarespace.Commerce) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout después de 10 segundos
            setTimeout(() => {
                clearInterval(checkInterval);
                this.logger.warn('Squarespace no detectado, usando modo fallback');
                resolve();
            }, 10000);
        });
    }

    /**
     * Inicializa el widget de envío
     */
    async initWidget() {
        try {
            // Cargar el widget
            if (typeof SeurShippingWidget !== 'undefined') {
                this.widget = new SeurShippingWidget({
                    endpoint: this.config.endpoint,
                    freeShippingThreshold: this.config.freeShippingThreshold,
                    updateInterval: this.config.updateInterval,
                    showProductDetails: this.config.showProductDetails,
                    showShippingDetails: this.config.showShippingDetails,
                    position: this.config.position,
                    theme: this.config.theme,
                    language: this.config.language
                });
                
                this.logger.info('Widget SEUR inicializado correctamente');
            } else {
                throw new Error('Clase SeurShippingWidget no encontrada');
            }
        } catch (error) {
            this.logger.error('Error inicializando widget SEUR', error);
            throw error;
        }
    }

    /**
     * Configura el monitoreo del carrito
     */
    setupCartMonitoring() {
        // Monitoreo usando API de Squarespace
        if (window.Squarespace && window.Squarespace.Commerce) {
            this.setupSquarespaceCartMonitoring();
        }
        
        // Monitoreo usando DOM como fallback
        this.setupDOMCartMonitoring();
    }

    /**
     * Configura monitoreo del carrito usando API de Squarespace
     */
    setupSquarespaceCartMonitoring() {
        try {
            // Evento de actualización del carrito
            window.Squarespace.Commerce.on('cart:update', (cartData) => {
                this.logger.debug('Carrito actualizado via API Squarespace', cartData);
                this.handleCartUpdate(cartData);
            });

            // Evento de producto agregado
            window.Squarespace.Commerce.on('cart:item:add', (itemData) => {
                this.logger.debug('Producto agregado via API Squarespace', itemData);
                this.handleProductAdded(itemData);
            });

            // Evento de producto removido
            window.Squarespace.Commerce.on('cart:item:remove', (itemData) => {
                this.logger.debug('Producto removido via API Squarespace', itemData);
                this.handleProductRemoved(itemData);
            });

            // Evento de cambio en cantidad
            window.Squarespace.Commerce.on('cart:item:quantity:change', (itemData) => {
                this.logger.debug('Cantidad cambiada via API Squarespace', itemData);
                this.handleQuantityChange(itemData);
            });

            this.logger.info('Monitoreo del carrito via API Squarespace configurado');
            
        } catch (error) {
            this.logger.warn('Error configurando monitoreo via API Squarespace', error);
        }
    }

    /**
     * Configura monitoreo del carrito usando DOM
     */
    setupDOMCartMonitoring() {
        try {
            // Observar cambios en elementos del carrito
            this.cartObserver = new MutationObserver((mutations) => {
                let cartChanged = false;
                
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' || mutation.type === 'attributes') {
                        // Verificar si los cambios afectan al carrito
                        if (this.isCartRelatedChange(mutation)) {
                            cartChanged = true;
                        }
                    }
                });
                
                if (cartChanged) {
                    this.logger.debug('Cambios detectados en el carrito via DOM');
                    this.debouncedCartUpdate();
                }
            });
            
            // Observar cambios en el body
            this.cartObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['data-quantity', 'data-price', 'class', 'data-cart-item']
            });
            
            this.logger.info('Monitoreo del carrito via DOM configurado');
            
        } catch (error) {
            this.logger.error('Error configurando monitoreo via DOM', error);
        }
    }

    /**
     * Verifica si un cambio está relacionado con el carrito
     */
    isCartRelatedChange(mutation) {
        const cartSelectors = this.config.squarespace.cartSelectors;
        
        // Verificar si el nodo agregado/removido es del carrito
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && cartSelectors.some(selector => node.matches && node.matches(selector))) {
                    return true;
                }
            });
            
            mutation.removedNodes.forEach(node => {
                if (node.nodeType === 1 && cartSelectors.some(selector => node.matches && node.matches(selector))) {
                    return true;
                }
            });
        }
        
        // Verificar si el atributo cambiado es del carrito
        if (mutation.type === 'attributes') {
            const target = mutation.target;
            return cartSelectors.some(selector => target.matches && target.matches(selector));
        }
        
        return false;
    }

    /**
     * Debounce para actualizaciones del carrito
     */
    debouncedCartUpdate() {
        if (this.cartUpdateTimeout) {
            clearTimeout(this.cartUpdateTimeout);
        }
        
        this.cartUpdateTimeout = setTimeout(() => {
            this.updateCartFromDOM();
        }, 500);
    }

    /**
     * Actualiza el carrito desde el DOM
     */
    updateCartFromDOM() {
        try {
            const cartData = this.extractCartDataFromDOM();
            if (cartData && this.hasCartChanged(cartData)) {
                this.logger.debug('Carrito actualizado desde DOM', cartData);
                this.handleCartUpdate(cartData);
            }
        } catch (error) {
            this.logger.warn('Error actualizando carrito desde DOM', error);
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
            const selectors = this.config.squarespace;
            
            // Buscar información del producto
            const nameElement = this.findElement(itemElement, selectors.productSelectors);
            const priceElement = this.findElement(itemElement, selectors.priceSelectors);
            const quantityElement = this.findElement(itemElement, selectors.quantitySelectors);
            const skuElement = this.findElement(itemElement, selectors.skuSelectors);

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
            this.logger.warn('Error extrayendo datos de item desde DOM', error);
            return null;
        }
    }

    /**
     * Busca un elemento usando múltiples selectores
     */
    findElement(parent, selectors) {
        for (const selector of selectors) {
            const element = parent.querySelector(selector);
            if (element) return element;
        }
        return null;
    }

    /**
     * Verifica si el carrito ha cambiado
     */
    hasCartChanged(newCartData) {
        if (!this.lastCartState) return true;
        
        const oldCart = this.lastCartState;
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
     * Configura eventos de Squarespace
     */
    setupSquarespaceEvents() {
        try {
            // Eventos de navegación
            if (window.Squarespace) {
                // Página cargada
                window.Squarespace.on('page:load', () => {
                    this.logger.debug('Página cargada en Squarespace');
                    this.handlePageLoad();
                });

                // Cambio de página
                window.Squarespace.on('page:change', () => {
                    this.logger.debug('Página cambiada en Squarespace');
                    this.handlePageChange();
                });
            }

            this.logger.info('Eventos de Squarespace configurados');
            
        } catch (error) {
            this.logger.warn('Error configurando eventos de Squarespace', error);
        }
    }

    /**
     * Maneja actualización del carrito
     */
    handleCartUpdate(cartData) {
        this.lastCartState = cartData;
        
        if (this.widget) {
            this.widget.handleCartUpdate(cartData);
        }
        
        // Notificar cambio
        this.notifications.info(`Carrito actualizado: ${cartData.itemCount} productos`);
    }

    /**
     * Maneja producto agregado
     */
    handleProductAdded(itemData) {
        if (this.widget) {
            this.widget.handleProductAdded(itemData);
        }
        
        // Notificar producto agregado
        this.notifications.success(`${itemData.name} agregado al carrito`);
    }

    /**
     * Maneja producto removido
     */
    handleProductRemoved(itemData) {
        if (this.widget) {
            this.widget.handleProductRemoved(itemData);
        }
        
        // Notificar producto removido
        this.notifications.info(`${itemData.name} removido del carrito`);
    }

    /**
     * Maneja cambio en cantidad
     */
    handleQuantityChange(itemData) {
        if (this.widget) {
            this.widget.handleQuantityChange(itemData);
        }
        
        // Notificar cambio en cantidad
        this.notifications.info(`Cantidad de ${itemData.name} actualizada`);
    }

    /**
     * Maneja carga de página
     */
    handlePageLoad() {
        this.logger.debug('Manejando carga de página');
        
        // Verificar si estamos en una página de carrito/checkout
        if (this.isCartPage()) {
            this.logger.info('Página de carrito detectada');
            this.ensureWidgetVisible();
        }
    }

    /**
     * Maneja cambio de página
     */
    handlePageChange() {
        this.logger.debug('Manejando cambio de página');
        
        // Reconfigurar monitoreo del carrito
        setTimeout(() => {
            this.setupCartMonitoring();
        }, 1000);
    }

    /**
     * Verifica si estamos en una página de carrito
     */
    isCartPage() {
        const cartIndicators = [
            '.cart-page',
            '.checkout-page',
            '[data-cart-page]',
            '.cart-summary',
            '.order-summary'
        ];
        
        return cartIndicators.some(selector => document.querySelector(selector));
    }

    /**
     * Asegura que el widget sea visible
     */
    ensureWidgetVisible() {
        if (this.widget && this.widget.state.isExpanded === false) {
            this.widget.expandWidget();
        }
    }

    /**
     * Obtiene el estado actual de la integración
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            widgetStatus: this.widget ? this.widget.getState() : null,
            lastCartState: this.lastCartState,
            config: this.config
        };
    }

    /**
     * Destruye la integración
     */
    destroy() {
        try {
            this.logger.info('Destruyendo integración SEUR-Squarespace...');
            
            // Destruir widget
            if (this.widget) {
                this.widget.destroy();
                this.widget = null;
            }
            
            // Detener observador del carrito
            if (this.cartObserver) {
                this.cartObserver.disconnect();
                this.cartObserver = null;
            }
            
            // Limpiar timeout
            if (this.cartUpdateTimeout) {
                clearTimeout(this.cartUpdateTimeout);
                this.cartUpdateTimeout = null;
            }
            
            this.isInitialized = false;
            this.logger.info('Integración SEUR-Squarespace destruida');
            
        } catch (error) {
            this.logger.error('Error destruyendo integración', error);
        }
    }
}

// ==============================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ==============================================================================

// Función global para inicializar la integración
window.initializeSeurSquarespaceIntegration = async function(config = {}) {
    try {
        const integrator = new SeurSquarespaceIntegrator(config);
        await integrator.init();
        
        // Guardar referencia global
        window.seurIntegrator = integrator;
        
        return integrator;
    } catch (error) {
        console.error('Error inicializando integración SEUR-Squarespace:', error);
        throw error;
    }
};

// Auto-inicialización cuando el DOM esté listo
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.initializeSeurSquarespaceIntegration();
        });
    } else {
        window.initializeSeurSquarespaceIntegration();
    }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SeurSquarespaceIntegrator;
}

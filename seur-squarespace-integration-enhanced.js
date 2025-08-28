/**
 * �� INTEGRACIÓN SEUR - SQUARESPACE ENHANCED (VERSIÓN FINAL CORREGIDA)
 * 
 * Archivo principal para integrar el calculador de envío SEUR en Squarespace.
 * Incluye validación del API Gateway y manejo robusto de errores.
 * 
 * @version 2.2.0 - ENDPOINTS CORREGIDOS
 * @author SEUR Integration Team
 * @github https://github.com/alexanderaguilar/canlecomte_seur_int
 */

// ==============================================================================
// CONFIGURACIÓN GLOBAL
// ==============================================================================

window.SEUR_CONFIG = {
    // Base URL del API Gateway
    baseUrl: 'https://z788h4e4ed.execute-api.us-east-2.amazonaws.com/DeployProd',
    
    // Endpoints específicos
    endpoints: {
        shippingCalculator: '/checkout-shipping',
        orderProcessor: '/process-order'
    },
    
    // Umbral para envío gratuito (en euros)
    freeShippingThreshold: 50.0,
    
    // Intervalo de actualización del carrito (ms)
    updateInterval: 3000,
    
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
    debug: true,
    
    // Timeout para requests (ms)
    requestTimeout: 10000,
    
    // Reintentos en caso de fallo
    maxRetries: 3
};

// ==============================================================================
// VALIDACIÓN DEL API GATEWAY
// ==============================================================================

class SeurApiValidator {
    constructor(config) {
        this.config = config;
        this.isValid = false;
        this.lastCheck = null;
        this.checkInterval = 60000; // 1 minuto
    }

    async validateEndpoint() {
        try {
            const endpoint = this.config.baseUrl + this.config.endpoints.shippingCalculator;
            console.log('[SEUR API] �� Validando endpoint:', endpoint);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    test: true,
                    cart_items: [],
                    shipping_address: { countryCode: 'ES' },
                    order_total: 0
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const result = await response.json();
                this.isValid = true;
                this.lastCheck = Date.now();
                console.log('[SEUR API] ✅ Endpoint válido:', result);
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            this.isValid = false;
            console.error('[SEUR API] ❌ Error validando endpoint:', error);
            
            if (error.name === 'AbortError') {
                console.error('[SEUR API] Timeout del endpoint');
            }
            
            return false;
        }
    }

    async checkHealth() {
        if (!this.lastCheck || (Date.now() - this.lastCheck) > this.checkInterval) {
            return await this.validateEndpoint();
        }
        return this.isValid;
    }

    getStatus() {
        return {
            isValid: this.isValid,
            lastCheck: this.lastCheck,
            baseUrl: this.config.baseUrl,
            endpoints: this.config.endpoints
        };
    }
}

// ==============================================================================
// INYECCIÓN DE ESTILOS CSS (CORREGIDO)
// ==============================================================================

function injectSeurStyles() {
    if (document.getElementById('seur-styles-injected')) {
        return;
    }
    
    const styles = `
        .seur-shipping-widget {
            position: fixed !important;
            bottom: 20px !important;
            right: 90px !important;
            width: 320px !important;
            max-width: calc(100vw - 40px) !important;
            background: white !important;
            border-radius: 4px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
            z-index: 999999 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            overflow: hidden !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            transform: translateY(0) !important;
            border: 1px solid #e0e0e0 !important;
            display: block !important;
        }

        .seur-shipping-widget.hidden {
            display: none !important;
        }

        .seur-widget-header {
            background: linear-gradient(135deg, #0066cc, #004499) !important;
            color: white !important;
            padding: 16px 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            cursor: pointer !important;
            user-select: none !important;
        }

        .seur-widget-header:hover {
            background: linear-gradient(135deg, #004499, #0066cc) !important;
        }

        .seur-widget-title {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-weight: 600 !important;
            font-size: 14px !important;
        }

        .seur-widget-icon {
            font-size: 18px !important;
            animation: seur-bounce 2s infinite !important;
        }

        @keyframes seur-bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-3px); }
            60% { transform: translateY(-2px); }
        }

        .seur-widget-toggle {
            background: rgba(255, 255, 255, 0.2) !important;
            border: none !important;
            color: white !important;
            width: 24px !important;
            height: 24px !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            font-size: 12px !important;
        }

        .seur-widget-toggle:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            transform: rotate(180deg) !important;
        }

        .seur-widget-content {
            max-height: 0 !important;
            overflow: hidden !important;
            transition: max-height 0.3s ease-in-out !important;
        }

        .seur-widget-content.expanded {
            max-height: 500px !important;
        }

        .seur-widget-body {
            padding: 20px !important;
        }

        .seur-widget-loading {
            text-align: center !important;
            padding: 20px !important;
            color: #343a40 !important;
        }

        .seur-spinner {
            display: inline-block !important;
            width: 20px !important;
            height: 20px !important;
            border: 2px solid #f8f9fa !important;
            border-top: 2px solid #0066cc !important;
            border-radius: 50% !important;
            animation: seur-spin 1s linear infinite !important;
            margin-bottom: 12px !important;
        }

        @keyframes seur-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .seur-loading-text {
            font-size: 13px !important;
            color: #343a40 !important;
        }

        .seur-shipping-info {
            margin-bottom: 16px !important;
        }

        .seur-shipping-cost {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            margin-bottom: 12px !important;
            padding: 12px !important;
            background: #f8f9fa !important;
            border-radius: 8px !important;
            border-left: 4px solid #0066cc !important;
        }

        .seur-shipping-cost.free {
            border-left-color: #28a745 !important;
            background: #d4edda !important;
        }

        .seur-cost-label {
            font-size: 13px !important;
            color: #343a40 !important;
            font-weight: 500 !important;
        }

        .seur-cost-value {
            font-size: 16px !important;
            font-weight: 700 !important;
            color: #0066cc !important;
        }

        .seur-cost-value.free {
            color: #28a745 !important;
        }

        .seur-cost-value.paid {
            color: #dc3545 !important;
        }

        .seur-free-shipping-message {
            background: linear-gradient(135deg, #28a745, #20c997) !important;
            color: white !important;
            padding: 12px !important;
            border-radius: 8px !important;
            text-align: center !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            margin-bottom: 12px !important;
            animation: seur-pulse 2s infinite !important;
        }

        @keyframes seur-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }

        .seur-free-shipping-icon {
            margin-right: 6px !important;
            font-size: 14px !important;
        }

        .seur-motivational-message {
            background: #ffc107 !important;
            color: #343a40 !important;
            padding: 10px 12px !important;
            border-radius: 6px !important;
            font-size: 12px !important;
            text-align: center !important;
            margin-bottom: 12px !important;
            border-left: 3px solid #e0a800 !important;
        }

        .seur-remaining-amount {
            font-weight: 700 !important;
            color: #0066cc !important;
        }

        .seur-shipping-details {
            background: #f8f9fa !important;
            border-radius: 8px !important;
            padding: 12px !important;
            margin-bottom: 16px !important;
        }

        .seur-detail-row {
            display: flex !important;
            justify-content: space-between !important;
            margin-bottom: 6px !important;
            font-size: 12px !important;
        }

        .seur-detail-row:last-child {
            margin-bottom: 0 !important;
        }

        .seur-detail-label {
            color: #343a40 !important;
            font-weight: 500 !important;
        }

        .seur-detail-value {
            color: #0066cc !important;
            font-weight: 600 !important;
        }

        .seur-cart-items {
            margin-bottom: 16px !important;
        }

        .seur-cart-item {
            display: flex !important;
            align-items: center !important;
            padding: 8px 0 !important;
            border-bottom: 1px solid #e9ecef !important;
        }

        .seur-cart-item:last-child {
            border-bottom: none !important;
        }

        .seur-item-icon {
            width: 32px !important;
            height: 32px !important;
            background: #0066cc !important;
            border-radius: 6px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: white !important;
            font-size: 14px !important;
            margin-right: 12px !important;
            flex-shrink: 0 !important;
        }

        .seur-item-details {
            flex: 1 !important;
            min-width: 0 !important;
        }

        .seur-item-name {
            font-size: 13px !important;
            font-weight: 600 !important;
            color: #343a40 !important;
            margin-bottom: 2px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        .seur-item-info {
            font-size: 11px !important;
            color: #6c757d !important;
            display: flex !important;
            gap: 8px !important;
        }

        .seur-item-quantity {
            background: #0066cc !important;
            color: white !important;
            padding: 2px 6px !important;
            border-radius: 10px !important;
            font-size: 10px !important;
            font-weight: 600 !important;
        }

        .seur-widget-error {
            background: #dc3545 !important;
            color: white !important;
            padding: 16px !important;
            text-align: center !important;
            border-radius: 8px !important;
            margin: 16px 0 !important;
        }

        .seur-error-icon {
            font-size: 24px !important;
            margin-bottom: 8px !important;
        }

        .seur-error-message {
            font-size: 13px !important;
            line-height: 1.4 !important;
        }

        .seur-recalculate-btn {
            width: 100% !important;
            background: #0066cc !important;
            color: white !important;
            border: none !important;
            padding: 12px !important;
            border-radius: 8px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            margin-top: 8px !important;
        }

        .seur-recalculate-btn:hover {
            background: #004499 !important;
            transform: translateY(-1px) !important;
        }

        .seur-recalculate-btn:active {
            transform: translateY(0) !important;
        }

        .seur-widget-footer {
            background: #f8f9fa !important;
            padding: 12px 20px !important;
            text-align: center !important;
            border-top: 1px solid #e9ecef !important;
        }

        .seur-footer-text {
            font-size: 11px !important;
            color: #6c757d !important;
        }

        .seur-footer-logo {
            color: #0066cc !important;
            font-weight: 600 !important;
        }

        .seur-widget.minimized .seur-widget-content {
            max-height: 0 !important;
        }

        .seur-widget.minimized .seur-widget-toggle {
            transform: rotate(0deg) !important;
        }

        .seur-widget-enter {
            animation: seur-slideIn 0.3s ease-out !important;
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
            animation: seur-successPulse 0.6s ease-out !important;
        }

        @keyframes seur-successPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }

        .seur-api-status {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            padding: 8px 12px !important;
            border-radius: 6px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            z-index: 1000000 !important;
            transition: all 0.3s ease !important;
        }

        .seur-api-status.connected {
            background: #28a745 !important;
            color: white !important;
        }

        .seur-api-status.disconnected {
            background: #dc3545 !important;
            color: white !important;
        }

        .seur-api-status.checking {
            background: #ffc107 !important;
            color: #343a40 !important;
        }

        @media (max-width: 768px) {
            .seur-shipping-widget {
                bottom: 10px !important;
                right: 10px !important;
                left: 10px !important;
                width: auto !important;
                max-width: none !important;
            }
        }

        @media (max-width: 480px) {
            .seur-shipping-widget {
                bottom: 5px !important;
                right: 5px !important;
                left: 5px !important;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.id = 'seur-styles-injected';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    
    console.log('[SEUR] ✅ Estilos CSS inyectados correctamente');
}

// ==============================================================================
// WIDGET FLOTANTE DE ENVÍO SEUR (CORREGIDO)
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
        this.apiValidator = new SeurApiValidator(this.config);
        this.init();
    }

    async init() {
        try {
            console.log('[SEUR] 🚀 Inicializando widget...');
            
            // Validar API Gateway primero
            const apiValid = await this.apiValidator.validateEndpoint();
            if (!apiValid) {
                console.warn('[SEUR] ⚠️ API Gateway no disponible, usando modo offline');
            }
            
            this.createWidget();
            this.attachEventListeners();
            this.startCartMonitoring();
            
            console.log('[SEUR] ✅ Widget inicializado correctamente');
            
            // Mostrar estado del API
            this.showApiStatus();
            
        } catch (error) {
            console.error('[SEUR] ❌ Error inicializando widget:', error);
        }
    }

    createWidget() {
        // Verificar si ya existe el widget
        if (document.getElementById('seur-shipping-widget')) {
            console.log('[SEUR] Widget ya existe, no se crea otro');
            return;
        }

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
                        <div class="seur-loading-text">Inicializando...</div>
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
        console.log('[SEUR] ✅ Widget creado y agregado al DOM');

        this.elements.widget = widget;
        this.elements.header = widget.querySelector('#seur-widget-header');
        this.elements.content = widget.querySelector('#seur-widget-content');
        this.elements.body = widget.querySelector('#seur-widget-body');
        this.elements.toggle = widget.querySelector('#seur-widget-toggle');
        this.elements.loading = widget.querySelector('#seur-widget-loading');
        
        // Mostrar widget inmediatamente
        this.showWidget();
    }

    showWidget() {
        if (this.elements.widget) {
            this.elements.widget.style.display = 'block';
            this.elements.widget.classList.remove('hidden');
            console.log('[SEUR] Widget mostrado');
        }
    }

    hideWidget() {
        if (this.elements.widget) {
            this.elements.widget.style.display = 'none';
            this.elements.widget.classList.add('hidden');
            console.log('[SEUR] Widget oculto');
        }
    }

    showApiStatus() {
        // Crear indicador de estado del API
        let statusElement = document.getElementById('seur-api-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'seur-api-status';
            statusElement.className = 'seur-api-status checking';
            statusElement.textContent = '�� Verificando API...';
            document.body.appendChild(statusElement);
        }

        // Actualizar estado
        const updateStatus = () => {
            const status = this.apiValidator.getStatus();
            if (status.isValid) {
                statusElement.className = 'seur-api-status connected';
                statusElement.textContent = '✅ API Conectado';
                setTimeout(() => {
                    statusElement.style.opacity = '0';
                    setTimeout(() => statusElement.remove(), 300);
                }, 3000);
            } else {
                statusElement.className = 'seur-api-status disconnected';
                statusElement.textContent = '❌ API Desconectado';
            }
        };

        updateStatus();
        setInterval(updateStatus, 30000); // Actualizar cada 30 segundos
    }

    attachEventListeners() {
        if (!this.elements.header || !this.elements.toggle) {
            console.error('[SEUR] Elementos no encontrados para event listeners');
            return;
        }

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

        console.log('[SEUR] ✅ Event listeners configurados');
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
        console.log('[SEUR] Widget expandido');
    }

    collapseWidget() {
        this.state.isExpanded = false;
        this.elements.content.classList.remove('expanded');
        this.elements.toggle.textContent = '▼';
        this.elements.widget.classList.add('minimized');
        console.log('[SEUR] Widget colapsado');
    }

    startCartMonitoring() {
        console.log('[SEUR] �� Iniciando monitoreo del carrito...');
        this.updateFromDOM();
        setInterval(() => this.updateFromDOM(), this.config.updateInterval);
    }

    updateFromDOM() {
        try {
            const cartData = this.extractCartDataFromDOM();
            if (cartData && this.hasCartChanged(cartData)) {
                console.log('[SEUR] �� Cambios detectados en el carrito:', cartData);
                this.handleCartUpdate(cartData);
            }
        } catch (error) {
            console.warn('[SEUR] ⚠️ Error actualizando desde DOM:', error);
        }
    }

    extractCartDataFromDOM() {
        const cartItems = [];
        
        // Selectores específicos para Squarespace
        const itemSelectors = [
            '.cart-item',
            '[data-cart-item]',
            '.sqs-cart-item',
            '.cart-product',
            '.product-item',
            '.item',
            '.product',
            '[data-product]'
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

        if (cartItems.length === 0) {
            // Buscar en elementos más generales
            const generalSelectors = [
                '.product',
                '.item',
                '[data-product]',
                '.cart-product',
                '.product-card',
                '.product-info'
            ];
            
            generalSelectors.forEach(selector => {
                const items = document.querySelectorAll(selector);
                items.forEach(item => {
                    const itemData = this.extractItemDataFromDOM(item);
                    if (itemData) {
                        cartItems.push(itemData);
                    }
                });
            });
        }

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
            // Selectores más flexibles para Squarespace
            const nameSelectors = [
                '.item-title', '.cart-item-title', '[data-item-title]', '.product-title',
                '.title', '.name', '.product-name', '.item-name', 'h1', 'h2', 'h3',
                '.product-title', '.item-name', '.product-name'
            ];
            
            const priceSelectors = [
                '.item-price', '.cart-item-price', '[data-item-price]', '.product-price',
                '.price', '.cost', '.amount', '[data-price]', '.product-price',
                '.price-value', '.cost-value'
            ];
            
            const quantitySelectors = [
                '.item-quantity', '.cart-item-quantity', '[data-item-quantity]', '.product-quantity',
                '.quantity', '.qty', '[data-quantity]', '.count', '.product-quantity'
            ];

            const nameElement = this.findElement(itemElement, nameSelectors);
            const priceElement = this.findElement(itemElement, priceSelectors);
            const quantityElement = this.findElement(itemElement, quantitySelectors);

            if (!nameElement || !priceElement) return null;

            const name = nameElement.textContent.trim();
            const price = parseFloat(priceElement.textContent.replace(/[^\d.,]/g, '').replace(',', '.'));
            const quantity = quantityElement ? parseInt(quantityElement.textContent.trim()) : 1;
            const sku = `ITEM-${Date.now()}`;

            if (isNaN(price) || price <= 0) return null;

            return {
                name,
                price,
                quantity,
                sku,
                productId: itemElement.dataset.productId || `PROD-${Date.now()}`
            };
        } catch (error) {
            console.warn('[SEUR] ⚠️ Error extrayendo datos de item:', error);
            return null;
        }
    }

    findElement(parent, selectors) {
        for (const selector of selectors) {
            const element = parent.querySelector(selector);
            if (element) return element;
        }
        return null;
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
        console.log('[SEUR] 📦 Carrito actualizado:', cartData);
        
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
            // Verificar API Gateway primero
            const apiValid = await this.apiValidator.checkHealth();
            
            if (apiValid) {
                await this.calculateWithApi(cartData);
            } else {
                console.log('[SEUR] �� API no disponible, usando cálculo local');
                const fallbackResult = this.calculateFallbackShipping(cartData);
                this.displayShippingResult(fallbackResult, cartData);
            }

        } catch (error) {
            console.error('[SEUR] ❌ Error calculando envío:', error);
            this.displayShippingError('Error de conexión. Usando cálculo local.');
            
            const fallbackResult = this.calculateFallbackShipping(cartData);
            this.displayShippingResult(fallbackResult, cartData);
        } finally {
            this.state.isCalculating = false;
        }
    }

    async calculateWithApi(cartData) {
        const endpoint = this.config.baseUrl + this.config.endpoints.shippingCalculator;
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

        console.log('[SEUR] �� Calculando con API:', endpoint);
        console.log('[SEUR] 📤 Datos enviados:', requestData);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('[SEUR] ✅ Resultado del API:', result);

            this.state.shippingData = result;
            this.state.lastCalculation = Date.now();
            
            if (result.success) {
                this.displayShippingResult(result, cartData);
            } else {
                this.displayShippingError(result.message || 'Error en el cálculo del API');
            }

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    calculateFallbackShipping(cartData) {
        console.log('[SEUR] 🔄 Usando cálculo de fallback');
        
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
            calculation_method: "cálculo local",
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

        const recalcBtn = this.elements.body.querySelector('#seur-recalculate-btn');
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

    // Método para procesar la orden (nuevo)
    async processOrder(orderData) {
        try {
            const endpoint = this.config.baseUrl + this.config.endpoints.orderProcessor;
            console.log('[SEUR] 🚀 Procesando orden:', endpoint);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('[SEUR] ✅ Orden procesada:', result);
            return result;

        } catch (error) {
            console.error('[SEUR] ❌ Error procesando orden:', error);
            throw error;
        }
    }

    destroy() {
        if (this.elements.widget && this.elements.widget.parentNode) {
            this.elements.widget.parentNode.removeChild(this.elements.widget);
        }
    }
}

// ==============================================================================
// INICIALIZACIÓN AUTOMÁTICA (CORREGIDA)
// ==============================================================================

function initializeSeurIntegration() {
    try {
        console.log('[SEUR] 🚀 Iniciando integración...');
        
        // Inyectar estilos primero
        injectSeurStyles();
        
        // Esperar un poco para que el DOM esté completamente listo
        setTimeout(() => {
            // Crear widget
            const widget = new SeurShippingWidget();
            
            // Guardar referencia global
            window.seurWidget = widget;
            
            console.log('[SEUR] ✅ Integración inicializada correctamente');
            
            // Mostrar notificación de éxito
            if (window.SEUR_CONFIG.debug) {
                console.log('[SEUR] Widget creado:', widget);
                console.log('[SEUR] Configuración:', window.SEUR_CONFIG);
                console.log('[SEUR] Endpoints configurados:', window.SEUR_CONFIG.endpoints);
            }
            
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('[SEUR] ❌ Error inicializando integración:', error);
        return false;
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[SEUR] 📄 DOM cargado, inicializando...');
        initializeSeurIntegration();
    });
} else {
    console.log('[SEUR] 📄 DOM ya listo, inicializando...');
    initializeSeurIntegration();
}

// Función global para acceso manual
window.initializeSeurShipping = initializeSeurIntegration;

// Verificar que se cargó correctamente
console.log('[SEUR] ✅ Script cargado correctamente');
console.log('[SEUR] �� Función disponible: window.initializeSeurShipping()');
console.log('[SEUR] 🌐 Base URL configurada:', window.SEUR_CONFIG.baseUrl);
console.log('[SEUR] 📍 Endpoints configurados:', window.SEUR_CONFIG.endpoints);
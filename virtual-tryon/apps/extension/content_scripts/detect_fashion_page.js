/**
 * File: detect_fashion_page.js
 * Purpose: Xác định trang hiện tại có phải trang thời trang / e-commerce hay không
 * Layer: Content Script / Filter (L1 + L2)
 *
 * Data Contract:
 * - Input: window.location (URL hiện tại), document <meta>, <title>
 * - Output: window.__fitlyIsFashionPage (boolean) — cached result
 *
 * Flow:
 * 1. Check domain against FASHION_DOMAINS whitelist (đa quốc gia)
 * 2. Check <title>, <meta> keywords/description for fashion keywords (đa ngôn ngữ)
 * 3. Check URL path for product patterns
 * 4. Exclude non-product paths (/login, /cart, /checkout, /account)
 * 5. Cache result per page load
 *
 * Edge Cases:
 * - Marketplace domains (amazon, ebay) — only match fashion sub-paths
 * - Generic domains — fallback to meta/title keyword detection
 * - International sites with non-Latin URLs
 */

(function () {
    'use strict';

    // Prevent multiple executions
    if (typeof window.__fitlyFashionDetectorLoaded !== 'undefined') return;
    window.__fitlyFashionDetectorLoaded = true;

    // ==========================================
    // FASHION DOMAIN WHITELIST
    // ==========================================

    /** Domains that are always considered fashion pages */
    const FASHION_DOMAINS = [
        // Vietnam
        'shopee.vn', 'lazada.vn', 'tiki.vn', 'sendo.vn',

        // Global fast fashion
        'zara.com', 'hm.com', 'uniqlo.com', 'asos.com', 'shein.com',
        'fashionnova.com', 'forever21.com', 'mango.com', 'gap.com',
        'oldnavy.com', 'bananarepublic.com', 'primark.com',
        'boohoo.com', 'prettylittlething.com', 'missguided.com',
        'topshop.com', 'next.co.uk', 'riverisland.com',

        // Asian — Japan
        'zozo.jp', 'zozotown.net', 'rakuten.co.jp', 'amazon.co.jp',
        'magaseek.com', 'fashionwalker.com', 'stripe-department.com',
        'baycrews.jp', 'urban-research.jp',

        // Asian — Korea
        'musinsa.com', 'wconcept.com', 'stylenanda.com',
        'gmarket.co.kr', '11st.co.kr', 'coupang.com',
        'ssfshop.com', 'lfmall.co.kr', 'handsome.co.kr',

        // Asian — China
        'taobao.com', 'tmall.com', 'jd.com', 'pinduoduo.com',
        'vip.com', 'mogujie.com',

        // Asian — Southeast Asia
        'zalora.com', 'zalora.vn', 'pomelo.com', 'yesstyle.com',
        'lazada.co.th', 'shopee.co.th', 'central.co.th',
        'lazada.co.id', 'shopee.co.id', 'tokopedia.com',
        'lazada.sg', 'shopee.sg', 'lazada.com.my', 'shopee.com.my',
        'lazada.com.ph', 'shopee.ph',

        // Luxury / Premium
        'farfetch.com', 'net-a-porter.com', 'ssense.com',
        'mytheresa.com', 'matchesfashion.com', 'luisaviaroma.com',
        'nordstrom.com', 'saksfifthavenue.com', 'bloomingdales.com',
        'neimanmarcus.com',

        // Sportswear
        'nike.com', 'adidas.com', 'puma.com', 'newbalance.com',
        'underarmour.com', 'reebok.com', 'asics.com',

        // Department / Multi-brand
        'macys.com', 'kohls.com', 'jcpenney.com', 'target.com',
        'walmart.com', 'costco.com',

        // Europe
        'aboutyou.com', 'zalando.de', 'zalando.fr', 'zalando.co.uk',
        'galerieslafayette.com', 'lacoste.com',
        'johnlewis.com', 'selfridges.com', 'harrods.com',
        'asos.de', 'asos.fr', 'asos.it',

        // Brand stores
        'levi.com', 'calvinklein.com', 'tommy.com', 'ralphlauren.com',
        'gucci.com', 'prada.com', 'louisvuitton.com', 'dior.com',
        'burberry.com', 'balenciaga.com', 'versace.com',
        'hermes.com', 'chanel.com', 'armani.com', 'fendi.com',
    ];

    /**
     * Marketplace domains — only fashion if URL path matches fashion categories.
     * Key: domain substring, Value: regex for fashion-related paths
     */
    const MARKETPLACE_FASHION_PATHS = {
        'amazon': /\/(fashion|clothing|shoes|bags|accessories|dp\/[A-Z0-9]+)/i,
        'ebay': /\/(fashion|clothing|shoes|sch\/.*clothing)/i,
        'etsy': /\/(listing|shop).*?(dress|shirt|jacket|clothing|fashion)/i,
        'rakuten': /\/(fashion|clothing|shoes|bag|f\/[a-z]+-wear)/i,
        'coupang': /\/(vp|products|search\?.*clothing)/i,
        'taobao': /\/(item|list).*?(服|裤|鞋|包|裙|衣)/i,
        'tmall': /\/(item|list).*?(服|裤|鞋|包|裙|衣)/i,
        'jd': /\/(product|item|list).*?(服|裤|鞋|包|裙|衣)/i,
    };

    /** Paths to exclude — never show buttons on these pages */
    const EXCLUDED_PATH_PATTERNS = [
        /\/(login|signin|sign-in|signup|sign-up|register)/i,
        /\/(cart|checkout|payment|order)/i,
        /\/(account|profile|settings|preferences)/i,
        /\/(help|support|faq|contact|about)/i,
        /\/(terms|privacy|policy)/i,
    ];

    /**
     * Fashion keywords to detect in <title>, <meta>, URL — MULTILINGUAL
     * Covers: EN, VI, JA, KO, ZH, TH, ID, ES, FR
     */
    const FASHION_KEYWORDS = new RegExp([
        // English
        'fashion', 'clothing', 'apparel', 'wear', 'outfit', 'dress', 'shirt',
        'jacket', 'pants', 'jeans', 'shoes', 'sneaker', 'accessori', 'handbag',
        'purse', 'style', 'boutique', 'garment', 'textile', 'lookbook', 'collection',

        // Vietnamese
        'thời trang', 'quần áo', 'váy', 'đầm', 'áo', 'giày', 'dép',
        'túi xách', 'phụ kiện', 'trang phục',

        // Japanese
        'ファッション', 'ウェア', 'アパレル', '服', '衣類', 'コーデ',
        'スタイル', 'コレクション', 'ルックブック', '新作', '着こなし',

        // Korean
        '패션', '의류', '옷', '코디', '스타일', '컬렉션', '신상',
        '데일리룩', '룩북', '착장',

        // Chinese
        '时尚', '服装', '服饰', '穿搭', '潮流', '新品', '款式',
        '搭配', '衣服', '穿着',

        // Thai
        'แฟชั่น', 'เสื้อผ้า', 'เครื่องแต่งกาย', 'สไตล์', 'คอลเลกชัน',

        // Indonesian
        'fashion', 'pakaian', 'busana', 'gaya', 'koleksi', 'mode',

        // Spanish
        'moda', 'ropa', 'vestimenta', 'estilo', 'colección', 'boutique',

        // French
        'mode', 'vêtement', 'habillement', 'collection', 'prêt-à-porter',
    ].join('|'), 'iu');

    /** Product page URL patterns */
    const PRODUCT_PATH_PATTERNS = /\/(product|p|item|i|dp|pd|detail|goods|shohin|sangpum|barang|produk)[\/\-]/i;

    // ==========================================
    // DETECTION LOGIC
    // ==========================================

    /**
     * Check if current hostname matches any whitelisted fashion domain.
     * Supports subdomains (e.g., m.shopee.vn, www.zara.com).
     */
    function isDomainWhitelisted(hostname) {
        const host = hostname.toLowerCase();
        return FASHION_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
    }

    /**
     * Check if current page is a fashion sub-path on a marketplace domain.
     */
    function isMarketplaceFashionPath(hostname, pathname) {
        const host = hostname.toLowerCase();
        for (const [key, regex] of Object.entries(MARKETPLACE_FASHION_PATHS)) {
            if (host.includes(key) && regex.test(pathname)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if current path is an excluded page (login, cart, etc.).
     */
    function isExcludedPath(pathname) {
        return EXCLUDED_PATH_PATTERNS.some(pattern => pattern.test(pathname));
    }

    /**
     * Check page metadata (title, meta tags) for fashion-related keywords.
     */
    function hasPageFashionSignals() {
        // STEP 1: Check <title>
        const title = document.title || '';
        if (FASHION_KEYWORDS.test(title)) return true;

        // STEP 2: Check <meta name="keywords"> and <meta name="description">
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords && FASHION_KEYWORDS.test(metaKeywords.content || '')) return true;

        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && FASHION_KEYWORDS.test(metaDesc.content || '')) return true;

        // STEP 3: Check Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && FASHION_KEYWORDS.test(ogTitle.content || '')) return true;

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && FASHION_KEYWORDS.test(ogDesc.content || '')) return true;

        // STEP 4: Check URL path for product patterns
        if (PRODUCT_PATH_PATTERNS.test(window.location.pathname)) {
            // On a product page — check if URL has any fashion hint
            if (FASHION_KEYWORDS.test(window.location.href)) return true;
        }

        return false;
    }

    // ==========================================
    // MAIN DETECTION — CACHED
    // ==========================================

    /**
     * Determine if the current page is a fashion page.
     * Result is cached on window.__fitlyIsFashionPage.
     * @returns {boolean}
     */
    function detectFashionPage() {
        // Return cached result if available
        if (typeof window.__fitlyIsFashionPage !== 'undefined') {
            return window.__fitlyIsFashionPage;
        }

        const hostname = window.location.hostname;
        const pathname = window.location.pathname;

        // STEP 1: Exclude non-product paths first
        if (isExcludedPath(pathname)) {
            window.__fitlyIsFashionPage = false;
            return false;
        }

        // STEP 2: Check whitelisted fashion domains
        if (isDomainWhitelisted(hostname)) {
            window.__fitlyIsFashionPage = true;
            return true;
        }

        // STEP 3: Check marketplace fashion sub-paths
        if (isMarketplaceFashionPath(hostname, pathname)) {
            window.__fitlyIsFashionPage = true;
            return true;
        }

        // STEP 4: Fallback — detect from page metadata
        if (hasPageFashionSignals()) {
            window.__fitlyIsFashionPage = true;
            return true;
        }

        // Default: not a fashion page
        window.__fitlyIsFashionPage = false;
        return false;
    }

    // Run detection when DOM is ready
    function initDetection() {
        detectFashionPage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDetection);
    } else {
        initDetection();
    }

    // Expose for other content scripts
    window.__fitlyIsFashionPage = undefined; // Will be set by detectFashionPage()
    window.__fitlyDetectFashionPage = detectFashionPage;

})();

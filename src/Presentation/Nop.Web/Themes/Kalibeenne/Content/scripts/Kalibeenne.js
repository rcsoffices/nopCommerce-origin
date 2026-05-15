(function () {
    'use strict';

    var BREAKPOINT = 1024;

    function getViewportWidth() {
        return window.innerWidth || document.documentElement.clientWidth;
    }

    // ---- Mobile nav toggle ----
    function initMobileNav() {
        var hamburger = document.getElementById('kali-hamburger');
        var nav = document.getElementById('kali-nav');
        var overlay = document.getElementById('kali-overlay');
        var searchDropdown = document.getElementById('kali-search-dropdown');

        if (!hamburger || !nav) return;

        function closeAll() {
            hamburger.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
            nav.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
            if (searchDropdown) searchDropdown.classList.remove('open');
        }

        hamburger.addEventListener('click', function () {
            var isOpen = nav.classList.contains('open');
            if (isOpen) {
                closeAll();
            } else {
                if (searchDropdown) searchDropdown.classList.remove('open');
                hamburger.classList.add('active');
                hamburger.setAttribute('aria-expanded', 'true');
                nav.classList.add('open');
                if (overlay) overlay.classList.add('show');
            }
        });

        if (overlay) {
            overlay.addEventListener('click', closeAll);
        }

        // Close on resize past breakpoint
        window.addEventListener('resize', function () {
            if (getViewportWidth() > BREAKPOINT) {
                closeAll();
            }
        });
    }

    // ---- Search toggle ----
    function initSearchToggle() {
        var searchToggle = document.getElementById('kali-search-toggle');
        var searchDropdown = document.getElementById('kali-search-dropdown');
        var overlay = document.getElementById('kali-overlay');
        var hamburger = document.getElementById('kali-hamburger');
        var nav = document.getElementById('kali-nav');

        if (!searchToggle || !searchDropdown) return;

        searchToggle.addEventListener('click', function () {
            var isOpen = searchDropdown.classList.contains('open');
            // Close mobile nav if open
            if (hamburger) hamburger.classList.remove('active');
            if (nav) nav.classList.remove('open');

            if (isOpen) {
                searchDropdown.classList.remove('open');
                if (overlay) overlay.classList.remove('show');
            } else {
                searchDropdown.classList.add('open');
                if (overlay) overlay.classList.add('show');
                // Focus the search input
                var input = searchDropdown.querySelector('input[type="text"]');
                if (input) input.focus();
            }
        });
    }

    // ---- Show body after load (prevents FOUC) ----
    function showBody() {
        document.body.style.display = 'flex';
    }

    // ---- Collapsible elements ----
    function initCollapsibles() {
        var items = document.querySelectorAll('.collapsible');
        for (var i = 0; i < items.length; i++) {
            items[i].addEventListener('click', function () {
                this.classList.toggle('active');
                var content = this.nextElementSibling;
                if (content && content.classList.contains('compose-content-description')) {
                    content.style.display = content.style.display === 'block' ? 'none' : 'block';
                }
            });
        }
    }

    // ---- Toast notifications (replaces bar-notification) ----
    function initToasts() {
        // Override nopCommerce's displayBarNotification with our toast system
        window.displayBarNotification = function (message, messagetype, timeout) {
            var messages = typeof message === 'string' ? [message] : message;
            if (!messages || messages.length === 0) return;

            var cssclass = ['success', 'error', 'warning'].indexOf(messagetype) !== -1 ? messagetype : 'success';
            var icons = { success: '✓', error: '✕', warning: '!' };
            var autoTimeout = timeout > 0 ? timeout : (cssclass === 'success' ? 4500 : 0);

            var container = document.getElementById('kali-toast-container');
            if (!container) return;

            messages.forEach(function (msg) {
                var toast = document.createElement('div');
                toast.className = 'kali-toast ' + cssclass;
                toast.innerHTML =
                    '<span class="kali-toast-icon">' + icons[cssclass] + '</span>' +
                    '<span class="kali-toast-body">' + msg + '</span>' +
                    '<button class="kali-toast-close" aria-label="Fermer" type="button">×</button>';

                container.appendChild(toast);

                function removeToast() {
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(24px)';
                    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                    setTimeout(function () {
                        if (toast.parentNode) toast.parentNode.removeChild(toast);
                    }, 260);
                }

                var closeBtn = toast.querySelector('.kali-toast-close');
                closeBtn.addEventListener('click', removeToast);

                if (autoTimeout > 0) {
                    setTimeout(removeToast, autoTimeout);
                }
            });
        };
    }

    // ---- Cart drawer ----
    function initCartDrawer() {
        var drawer = document.getElementById('kali-cart-drawer');
        var overlay = document.getElementById('kali-drawer-overlay');
        var closeBtn = document.getElementById('kali-cart-drawer-close');
        var fab = document.getElementById('kali-cart-fab');
        var badge = document.getElementById('kali-cart-fab-badge');

        if (!drawer) return;

        // Hide FAB on cart/checkout pages
        if (fab) {
            var path = window.location.pathname.toLowerCase();
            if (path === '/cart' || path.indexOf('/checkout') === 0 || path === '/onepagecheckout') {
                fab.style.display = 'none';
            }
        }

        function openDrawer() {
            drawer.classList.add('open');
            if (overlay) overlay.classList.add('show');
            document.body.style.overflow = 'hidden';
        }

        function closeDrawer() {
            drawer.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
            document.body.style.overflow = '';
        }

        // Close on button / overlay click
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);

        // Open on FAB click
        if (fab) fab.addEventListener('click', openDrawer);

        // Close on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && drawer.classList.contains('open')) {
                closeDrawer();
            }
        });

        // Update FAB badge from the flyout cart count
        function updateFabBadge() {
            if (!badge) return;
            var countLink = document.querySelector('#flyout-cart .mini-shopping-cart .count a');
            var countText = countLink ? countLink.textContent.trim() : '';
            var match = countText.match(/\d+/);
            var count = match ? parseInt(match[0], 10) : 0;
            badge.textContent = count > 0 ? count : '';
            badge.classList.toggle('visible', count > 0);
        }

        // Hook into AjaxCart success to open drawer on cart add
        function hookAjaxCart() {
            if (typeof AjaxCart === 'undefined') return;

            var _origSuccess = AjaxCart.success_process;
            AjaxCart.success_process = function (response) {
                _origSuccess.call(this, response);
                // If flyout cart was refreshed, it means a cart action happened
                if (response.updateflyoutcartsectionhtml) {
                    openDrawer();
                    // Let the DOM settle after replaceWith before reading badge
                    setTimeout(updateFabBadge, 80);
                }
            };
        }

        // ── Drawer cart item interactions (qty +/-, delete) ──
        function refreshFlyoutFromHtml(responseHtml) {
            try {
                var parser = new DOMParser();
                var doc = parser.parseFromString(responseHtml, 'text/html');
                var newFlyout = doc.getElementById('flyout-cart');
                var existing = document.getElementById('flyout-cart');
                if (newFlyout && existing) {
                    existing.outerHTML = newFlyout.outerHTML;
                    updateFabBadge();
                }
            } catch (e) { /* silently ignore parse errors */ }
        }

        function postCartUpdate(formData, callback) {
            var token = document.querySelector('input[name="__RequestVerificationToken"]');
            if (token) formData['__RequestVerificationToken'] = token.value;
            formData['updatecart'] = 'updatecart';

            $.ajax({
                url: '/cart',
                type: 'POST',
                data: formData,
                success: callback,
                error: function () { /* ignore network errors */ }
            });
        }

        function initDrawerItemActions() {
            $(document).on('click', '.kali-drawer-qty-plus', function () {
                var $btn = $(this);
                var itemId = $btn.data('item-id');
                var $item = $btn.closest('.item[data-item-id]');
                var currentQty = parseInt($item.data('qty'), 10) || 1;
                var newQty = currentQty + 1;
                var formData = {};
                formData['itemquantity' + itemId] = newQty;
                postCartUpdate(formData, function (html) { refreshFlyoutFromHtml(html); });
            });

            $(document).on('click', '.kali-drawer-qty-minus', function () {
                var $btn = $(this);
                var itemId = $btn.data('item-id');
                var $item = $btn.closest('.item[data-item-id]');
                var currentQty = parseInt($item.data('qty'), 10) || 1;
                var newQty = currentQty - 1;
                var formData = {};
                if (newQty <= 0) {
                    formData['removefromcart'] = String(itemId);
                } else {
                    formData['itemquantity' + itemId] = newQty;
                }
                postCartUpdate(formData, function (html) { refreshFlyoutFromHtml(html); });
            });

            $(document).on('click', '.kali-drawer-remove', function () {
                var itemId = $(this).data('item-id');
                var formData = { removefromcart: String(itemId) };
                postCartUpdate(formData, function (html) { refreshFlyoutFromHtml(html); });
            });
        }

        // Initial badge count on page load
        updateFabBadge();

        // Hook AjaxCart after jQuery is ready
        if (typeof $ !== 'undefined') {
            $(function () {
                hookAjaxCart();
                initDrawerItemActions();
            });
        } else {
            hookAjaxCart();
        }
    }

    // ---- Init ----
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initMobileNav();
        initSearchToggle();
        showBody();
        initCollapsibles();
        initToasts();
        initCartDrawer();
    }

})();

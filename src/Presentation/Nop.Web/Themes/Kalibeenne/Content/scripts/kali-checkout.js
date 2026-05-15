/**
 * KaliCheckout — One-step checkout orchestrator for Kalibeenne theme
 *
 * Wraps nopCommerce OPC AJAX endpoints behind a single-form UX:
 *   Phase 1 → single form (address + shipping method + payment method + plugin fields)
 *   Phase 2 → order review + confirm button
 *
 * Uses the existing Billing / Shipping / ShippingMethod / PaymentMethod /
 * PaymentInfo / ConfirmOrder objects from public.onepagecheckout.js.
 */

var KaliCheckout = (function ($) {
    'use strict';

    /* ── Config (set via init) ── */
    var cfg = {
        shippingRequired: true,
        disableBillingStep: false,
        isGuest: false,
        failureUrl: '/',
        termsRequired: false
    };

    /* ── State ── */
    var _shippingRefreshTimer = null;
    var state = {
        billingDone: false,
        shippingDone: false,
        shippingMethodDone: false,
        paymentMethodDone: false,
        paymentInfoDone: false,
        busy: false,
        readyToConfirm: false
    };

    /* ── Helpers ── */
    function showError(container, messages) {
        var $el = $(container);
        if (!messages || !messages.length) { $el.hide(); return; }
        var html = '<ul>' + (Array.isArray(messages) ? messages : [messages])
            .map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>';
        $el.html(html).show();
        $('html, body').animate({ scrollTop: $el.offset().top - 100 }, 300);
    }

    function clearError(container) {
        $(container).hide().html('');
    }

    function setBusy(on) {
        state.busy = on;
        var $btn = $('#kali-os-pay-btn');
        $btn.prop('disabled', on);
        $btn.find('.kali-os-btn-text').toggle(!on);
        $btn.find('.kali-os-btn-spinner').toggle(on);
    }

    /* ──────────────────────────────────────────────────────────────
       PHASE 1 — Progressive card reveal
       ────────────────────────────────────────────────────────────── */

    /**
     * Move billing fields from hidden OPC section into the visible render zone.
     * Called once after Billing.init() has rendered the partial.
     */
    function revealBillingFields() {
        var $billingContent = $('#checkout-billing-load').children();
        if ($billingContent.length) {
            $('#kali-billing-render').html('').append($billingContent.clone(true, true));
        } else {
            // Fields already in place (simple form)
            $('#kali-billing-render').html($('#checkout-billing-load').html());
        }
        // Re-init country select inside the cloned fields
        if ($('#kali-billing-render select[data-trigger="country-select"]').length) {
            $('#kali-billing-render select[data-trigger="country-select"]').countrySelect();
        }
        $('#kali-os-address-card').show();
    }

    /**
     * Sync values typed in visible #kali-billing-render back to the hidden
     * #co-billing-form so that serialize() picks up the latest user input.
     */
    function syncBillingToHiddenForm() {
        $('#kali-billing-render :input').each(function () {
            var name = $(this).attr('name');
            if (!name) return;
            var $target = $('#co-billing-form [name="' + name + '"]');
            if (!$target.length) return;
            if ($(this).is(':checkbox') || $(this).is(':radio')) {
                $target.prop('checked', $(this).prop('checked'));
            } else {
                $target.val($(this).val());
            }
        });
    }

    /**
     * Refresh shipping methods silently after an address field changes.
     * Posts billing to server to get updated rates, then re-renders the cards.
     */
    function refreshShippingMethods() {
        if (!cfg.shippingRequired) return;

        $('#kali-shipping-method-render').html(
            '<div class="kali-os-loading-hint"><span class="kali-spinner-sm"></span> Mise à jour des livraisons…</div>'
        );

        syncBillingToHiddenForm();

        $.ajax({
            cache: false,
            url: Billing.saveUrl,
            data: $('#co-billing-form').serialize(),
            type: 'POST',
            success: function (resp) {
                if (resp.error) {
                    $('#kali-shipping-method-render').html(
                        '<p class="kali-os-no-methods">Complétez votre adresse pour voir les modes de livraison.</p>'
                    );
                    return;
                }
                // Server may return updated shipping methods directly
                if (resp.update_section && resp.update_section.name === 'shipping-methods') {
                    $('#checkout-shipping-method-load').html(resp.update_section.html);
                }
                // Then fetch current shipping method list
                $.ajax({
                    cache: false,
                    url: ShippingMethod.saveUrl,
                    data: $('#co-shipping-method-form').serialize(),
                    type: 'POST',
                    success: function () { renderShippingMethods(); },
                    error: function () { renderShippingMethods(); }
                });
            },
            error: function () {
                renderShippingMethods();
            }
        });
    }

    /**
     * Watch billing address fields that affect shipping rates and
     * re-trigger a shipping method refresh when they change.
     */
    function watchAddressFields() {
        // Country / State selects — react after nopCommerce may repopulate the state list
        $(document).on('change',
            '#kali-billing-render select[name$="CountryId"], #kali-billing-render select[name$="StateProvinceId"]',
            function () {
                clearTimeout(_shippingRefreshTimer);
                _shippingRefreshTimer = setTimeout(refreshShippingMethods, 600);
            }
        );

        // Zip / City — debounce while typing
        $(document).on('input',
            '#kali-billing-render input[name$="ZipPostalCode"], #kali-billing-render input[name$="City"]',
            function () {
                clearTimeout(_shippingRefreshTimer);
                _shippingRefreshTimer = setTimeout(refreshShippingMethods, 900);
            }
        );
    }

    /**
     * Load shipping method list via OpcSaveBilling response → update_section.
     * Called when Billing.nextStep resolves.
     */
    function onBillingDone(response) {
        state.billingDone = true;
        clearError('#kali-os-errors');

        if (!cfg.shippingRequired) {
            loadPaymentMethods();
        } else {
            // Shipping address — if server sends it
            if (response && response.update_section && response.update_section.name === 'shipping') {
                $('#checkout-shipping-load').html(response.update_section.html);
            }
            revealShippingCard();
        }
    }

    function revealShippingCard() {
        // Load shipping method list
        $('#kali-os-shipping-card').show();
        loadShippingMethods();
    }

    function loadShippingMethods() {
        $('#kali-shipping-method-render').html(
            '<div class="kali-os-loading-hint"><span class="kali-spinner-sm"></span> Chargement…</div>'
        );

        $.ajax({
            cache: false,
            url: ShippingMethod.saveUrl,
            data: $('#co-shipping-method-form').serialize(),
            type: 'POST',
            success: function (response) {
                if (response.error) {
                    // Shipping method not yet available (expected on first load)
                    // Trigger billing → shipping save chain to populate shipping methods
                    saveBillingSilent(function () {
                        renderShippingMethods();
                    });
                    return;
                }
                renderShippingMethods();
            },
            error: function () {
                renderShippingMethods();
            }
        });
    }

    /** Render shipping methods from #checkout-shipping-method-load into visible zone */
    function renderShippingMethods() {
        var $src = $('#checkout-shipping-method-load');
        var html = $src.html();
        if (!html || !html.trim()) {
            $('#kali-shipping-method-render').html(
                '<p class="kali-os-no-methods">Aucun mode de livraison disponible.</p>'
            );
            return;
        }
        $('#kali-shipping-method-render').html(buildMethodCards($src, 'shippingoption', 'shipping'));
        syncMethodSelection('shippingoption', '#checkout-shipping-method-load', '#kali-shipping-method-render');
    }

    function onShippingMethodSelected() {
        // When user changes shipping method, load payment methods
        if (!state.paymentMethodDone) {
            loadPaymentMethods();
        }
    }

    function loadPaymentMethods() {
        $('#kali-os-payment-card').show();
        $('#kali-payment-method-render').html(
            '<div class="kali-os-loading-hint"><span class="kali-spinner-sm"></span> Chargement…</div>'
        );

        $.ajax({
            cache: false,
            url: PaymentMethod.saveUrl,
            data: $('#co-payment-method-form').serialize(),
            type: 'POST',
            success: function (response) {
                if (response && response.update_section && response.update_section.name === 'payment-method') {
                    $('#checkout-payment-method-load').html(response.update_section.html);
                }
                renderPaymentMethods();
                if (response && response.goto_section === 'payment_info') {
                    loadPaymentPlugin();
                }
                $('#kali-os-cta-row').show();
            },
            error: function () {
                renderPaymentMethods();
                $('#kali-os-cta-row').show();
            }
        });
    }

    /** Render payment method radio cards */
    function renderPaymentMethods() {
        var $src = $('#checkout-payment-method-load');
        $('#kali-payment-method-render').html(buildMethodCards($src, 'paymentmethod', 'payment'));
        syncMethodSelection('paymentmethod', '#checkout-payment-method-load', '#kali-payment-method-render');

        // On method change → reload plugin zone
        $('#kali-payment-method-render').on('change', 'input[name="paymentmethod"]', function () {
            state.paymentMethodDone = false;
            state.paymentInfoDone = false;
            // Sync selection to hidden form
            var val = $(this).val();
            $('#checkout-payment-method-load input[name="paymentmethod"][value="' + val + '"]').prop('checked', true);
            loadPaymentPluginForMethod(val);
        });

        // Show plugin for pre-selected method
        var preSelected = $('#checkout-payment-method-load input[name="paymentmethod"]:checked').val();
        if (preSelected) {
            loadPaymentPluginForMethod(preSelected);
        }
    }

    /**
     * Build visual card/radio list from raw OPC HTML.
     * type: 'shippingoption' | 'paymentmethod'
     */
    function buildMethodCards($src, inputName, prefix) {
        var $methods = $src.find('input[name="' + inputName + '"]');
        if (!$methods.length) {
            // Re-render raw HTML (reward points / no methods)
            return $src.html();
        }

        var html = '<ul class="kali-os-method-cards">';
        $methods.each(function (i) {
            var $input = $(this);
            var id = prefix + '_card_' + i;
            var value = $input.val();
            var checked = $input.is(':checked');
            var $li = $input.closest('li');

            // Label text
            var $label = $li.find('label[for="' + $input.attr('id') + '"]');
            var labelText = $label.length ? $label.text().trim() : value;

            // Logo (payment only)
            var $img = $li.find('img');
            var logoHtml = $img.length
                ? '<img src="' + $img.attr('src') + '" alt="' + $img.attr('alt') + '" class="kali-os-method-logo" />'
                : '';

            // Description
            var $desc = $li.find('.payment-description, .method-description');
            var descHtml = $desc.length ? '<span class="kali-os-method-desc">' + $desc.html() + '</span>' : '';

            // Fee / additional info in label
            var $feeLabel = $li.find('.method-name label');
            var feeHtml = '';
            if (!logoHtml && $feeLabel.length) {
                var feeText = $feeLabel.text().trim();
                if (feeText && feeText !== labelText) {
                    feeHtml = '<span class="kali-os-method-fee">' + feeText + '</span>';
                }
            }

            html += '<li class="kali-os-method-card' + (checked ? ' selected' : '') + '">';
            html += '<label class="kali-os-method-card-inner" for="' + id + '">';
            html += '<input type="radio" id="' + id + '" name="' + inputName + '" value="' + value + '"' + (checked ? ' checked' : '') + ' />';
            if (logoHtml) html += logoHtml;
            html += '<span class="kali-os-method-name">' + labelText + '</span>';
            if (feeHtml) html += feeHtml;
            if (descHtml) html += descHtml;
            html += '</label>';
            html += '</li>';
        });
        html += '</ul>';
        return html;
    }

    /** Keep hidden OPC form inputs in sync with visible card selections */
    function syncMethodSelection(inputName, hiddenContainer, visibleContainer) {
        $(visibleContainer).on('change', 'input[name="' + inputName + '"]', function () {
            var val = $(this).val();
            // Update card highlight
            $(visibleContainer + ' .kali-os-method-card').removeClass('selected');
            $(this).closest('.kali-os-method-card').addClass('selected');
            // Sync to hidden form
            $(hiddenContainer + ' input[name="' + inputName + '"][value="' + val + '"]').prop('checked', true);
        });
    }

    function loadPaymentPluginForMethod(methodSystemName) {
        // Save payment method selection, get back payment-info section
        $('#checkout-payment-method-load input[name="paymentmethod"][value="' + methodSystemName + '"]').prop('checked', true);

        $('#kali-payment-plugin-fields').html(
            '<div class="kali-os-loading-hint"><span class="kali-spinner-sm"></span> Chargement…</div>'
        );
        $('#kali-payment-info-render').show();

        $.ajax({
            cache: false,
            url: PaymentMethod.saveUrl,
            data: $('#co-payment-method-form').serialize(),
            type: 'POST',
            success: function (response) {
                if (response.error) {
                    $('#kali-payment-info-render').hide();
                    return;
                }
                if (response.update_section && response.update_section.name === 'payment-info') {
                    $('#checkout-payment-info-load').html(response.update_section.html);
                    renderPaymentPlugin();
                } else if (response.goto_section === 'confirm_order') {
                    // No payment info needed (e.g. cheque / free)
                    $('#kali-payment-info-render').hide();
                    state.paymentInfoDone = true;
                } else {
                    renderPaymentPlugin();
                }
            },
            error: function () {
                $('#kali-payment-info-render').hide();
            }
        });
    }

    function loadPaymentPlugin() {
        var $src = $('#checkout-payment-info-load');
        if ($src.children().length) {
            renderPaymentPlugin();
        }
    }

    function renderPaymentPlugin() {
        var $src = $('#checkout-payment-info-load');
        if (!$src.children().length && !$src.text().trim()) {
            $('#kali-payment-info-render').hide();
            return;
        }
        $('#kali-payment-plugin-fields').html($src.html());
        $('#kali-payment-info-render').show();
        // Re-run any inline scripts inside the plugin
        $('#kali-payment-plugin-fields script').each(function () {
            try { $.globalEval($(this).text()); } catch (e) { /* ignore */ }
        });
    }

    /* ──────────────────────────────────────────────────────────────
       PHASE 1 → PHASE 2 : "Vérifier ma commande" chain
       ────────────────────────────────────────────────────────────── */

    /**
     * Validate HTML5 + custom checks before launching the chain.
     */
    function validateForm() {
        var errors = [];

        // HTML5 native validation on billing form
        var billingForm = document.getElementById('co-billing-form');
        if (billingForm && !billingForm.checkValidity()) {
            billingForm.reportValidity();
            return false;
        }

        // Shipping method selected
        if (cfg.shippingRequired) {
            var shippingChecked = $('input[name="shippingoption"]:checked').length ||
                $('#checkout-shipping-method-load input[name="shippingoption"]:checked').length;
            if (!shippingChecked) {
                errors.push('Veuillez choisir un mode de livraison.');
            }
        }

        // Payment method selected
        var paymentChecked = $('input[name="paymentmethod"]:checked').length ||
            $('#checkout-payment-method-load input[name="paymentmethod"]:checked').length;
        if (!paymentChecked) {
            errors.push('Veuillez choisir une méthode de paiement.');
        }

        if (errors.length) {
            showError('#kali-os-errors', errors);
            return false;
        }
        return true;
    }

    /**
     * Sync visible card inputs back to the hidden OPC forms before POSTing.
     */
    function syncFormsFromCards() {
        // Shipping
        var shippingVal = $('#kali-shipping-method-render input[name="shippingoption"]:checked').val();
        if (shippingVal) {
            $('#checkout-shipping-method-load input[name="shippingoption"][value="' + shippingVal + '"]').prop('checked', true);
        }
        // Payment method
        var paymentVal = $('#kali-payment-method-render input[name="paymentmethod"]:checked').val();
        if (paymentVal) {
            $('#checkout-payment-method-load input[name="paymentmethod"][value="' + paymentVal + '"]').prop('checked', true);
        }
        // Payment plugin fields — sync from rendered zone to hidden form
        $('#kali-payment-plugin-fields :input').each(function () {
            var name = $(this).attr('name');
            if (!name) return;
            var $hidden = $('#checkout-payment-info-load [name="' + name + '"]');
            if ($hidden.length) {
                if ($(this).is(':checkbox') || $(this).is(':radio')) {
                    $hidden.prop('checked', $(this).prop('checked'));
                } else {
                    $hidden.val($(this).val());
                }
            }
        });
    }

    /** 
     * Silently run billing save to populate server-side session data.
     * Needed when disableBillingStep = false.
     */
    function saveBillingSilent(callback) {
        syncBillingToHiddenForm();
        $.ajax({
            cache: false,
            url: Billing.saveUrl,
            data: $('#co-billing-form').serialize(),
            type: 'POST',
            success: function (response) {
                if (response.error) {
                    var msg = Array.isArray(response.message) ? response.message : [response.message];
                    showError('#kali-os-errors', msg);
                    setBusy(false);
                    return;
                }
                if (response.update_section && response.update_section.name === 'shipping') {
                    $('#checkout-shipping-load').html(response.update_section.html);
                }
                if (callback) callback(response);
            },
            error: function () {
                location.href = cfg.failureUrl;
            }
        });
    }

    /** AJAX chain: billing → shipping → shippingMethod → paymentMethod → paymentInfo → show phase 2 */
    function runChain() {
        if (state.busy) return;
        if (!validateForm()) return;

        setBusy(true);
        clearError('#kali-os-errors');
        syncBillingToHiddenForm();
        syncFormsFromCards();

        // Step 1 — Billing
        $.ajax({
            cache: false,
            url: Billing.saveUrl,
            data: $('#co-billing-form').serialize(),
            type: 'POST',
            success: function (resp) {
                if (resp.error) {
                    handleChainError(resp.message);
                    return;
                }
                if (resp.update_section && resp.update_section.name === 'shipping') {
                    $('#checkout-shipping-load').html(resp.update_section.html);
                }
                stepShipping();
            },
            error: function () { location.href = cfg.failureUrl; }
        });
    }

    function stepShipping() {
        if (!cfg.shippingRequired) {
            stepPaymentMethod();
            return;
        }
        $.ajax({
            cache: false,
            url: Shipping.saveUrl,
            data: $('#co-shipping-form').serialize(),
            type: 'POST',
            success: function (resp) {
                if (resp.error) { handleChainError(resp.message); return; }
                stepShippingMethod();
            },
            error: function () { location.href = cfg.failureUrl; }
        });
    }

    function stepShippingMethod() {
        $.ajax({
            cache: false,
            url: ShippingMethod.saveUrl,
            data: $('#co-shipping-method-form').serialize(),
            type: 'POST',
            success: function (resp) {
                if (resp.error) { handleChainError(resp.message); return; }
                stepPaymentMethod();
            },
            error: function () { location.href = cfg.failureUrl; }
        });
    }

    function stepPaymentMethod() {
        $.ajax({
            cache: false,
            url: PaymentMethod.saveUrl,
            data: $('#co-payment-method-form').serialize(),
            type: 'POST',
            success: function (resp) {
                if (resp.error) { handleChainError(resp.message); return; }
                if (resp.update_section && resp.update_section.name === 'payment-info') {
                    $('#checkout-payment-info-load').html(resp.update_section.html);
                    stepPaymentInfo();
                } else if (resp.goto_section === 'confirm_order') {
                    // No payment info needed
                    loadConfirmSection();
                } else {
                    stepPaymentInfo();
                }
            },
            error: function () { location.href = cfg.failureUrl; }
        });
    }

    function stepPaymentInfo() {
        // Sync plugin fields one more time just before posting
        syncFormsFromCards();
        $.ajax({
            cache: false,
            url: PaymentInfo.saveUrl,
            data: $('#co-payment-info-form').serialize(),
            type: 'POST',
            success: function (resp) {
                if (resp.error) { handleChainError(resp.message); return; }
                if (resp.goto_section === 'confirm_order' || resp.update_section) {
                    if (resp.update_section && resp.update_section.name === 'confirm-order') {
                        $('#checkout-confirm-order-load').html(resp.update_section.html);
                    }
                    loadConfirmSection();
                } else {
                    loadConfirmSection();
                }
            },
            error: function () { location.href = cfg.failureUrl; }
        });
    }

    function loadConfirmSection() {
        var confirmHtml = $('#checkout-confirm-order-load').html();
        if (confirmHtml && confirmHtml.trim()) {
            checkTosAndProceed(null);
        } else {
            var postData = {};
            if (typeof addAntiForgeryToken === 'function') {
                addAntiForgeryToken(postData);
            }
            $.ajax({
                cache: false,
                url: ConfirmOrder.saveUrl || '/checkout/OpcConfirmOrder/',
                type: 'POST',
                data: postData,
                success: function (resp) {
                    checkTosAndProceed(resp);
                },
                error: function () {
                    checkTosAndProceed(null);
                }
            });
        }
    }

    function checkTosAndProceed(resp) {
        if (resp && resp.update_section) {
            $('#checkout-confirm-order-load').html(resp.update_section.html);
        }

        var confirmHtml = $('#checkout-confirm-order-load').html() || '';
        var hasTos = confirmHtml.indexOf('termsofservice') !== -1 || cfg.termsRequired;

        if (hasTos) {
            $('#kali-os-tos').show();
            $('#kali-os-pay-btn .kali-os-btn-text').text('Confirmer la commande');
            state.readyToConfirm = true;
            $('#kali-termsofservice').off('change.tos').on('change.tos', function () {
                $('#checkout-confirm-order-load input[name="termsofservice"]').prop('checked', $(this).prop('checked'));
            });
            setBusy(false);
            $('html, body').animate({ scrollTop: $('#kali-os-tos').offset().top - 120 }, 300);
        } else {
            submitConfirmOrder();
        }
    }

    function handleChainError(message) {
        setBusy(false);
        var msgs = Array.isArray(message) ? message : [message];
        showError('#kali-os-errors', msgs);
    }

    /* ──────────────────────────────────────────────────────────────
       PHASE 2 — Confirm & submit
       ────────────────────────────────────────────────────────────── */

    function submitConfirmOrder() {
        clearError('#kali-os-errors');

        if ($('#kali-os-tos').is(':visible') && !$('#kali-termsofservice').is(':checked')) {
            showError('#kali-os-errors', ['Veuillez accepter les conditions générales de vente.']);
            return;
        }

        setBusy(true);
        var postData = {};
        if (typeof addAntiForgeryToken === 'function') {
            addAntiForgeryToken(postData);
        }

        $.ajax({
            cache: false,
            url: ConfirmOrder.saveUrl,
            data: postData,
            type: 'POST',
            success: function (resp) {
                setBusy(false);
                if (resp.error) {
                    var msgs = Array.isArray(resp.message) ? resp.message : [resp.message];
                    showError('#kali-os-errors', msgs);
                    return;
                }
                if (resp.redirect) {
                    location.href = resp.redirect;
                    return;
                }
                if (ConfirmOrder.successUrl) {
                    location.href = ConfirmOrder.successUrl;
                }
            },
            error: function () {
                setBusy(false);
                location.href = cfg.failureUrl;
            }
        });
    }

    /* ──────────────────────────────────────────────────────────────
       INIT
       ────────────────────────────────────────────────────────────── */

    function init(options) {
        $.extend(cfg, options || {});

        // Move billing fields to visible zone
        if (!cfg.disableBillingStep) {
            revealBillingFields();
        }

        // Sync Contact email field <-> hidden billing form
        if (cfg.isGuest) {
            var existingEmail = $('#co-billing-form input[name$="Email"]').val();
            if (existingEmail) {
                $('#kali-contact-email').val(existingEmail);
            }
            $('#kali-contact-email').on('input change', function () {
                $('#co-billing-form input[name$="Email"]').val($(this).val());
            });
        }

        // If billing step is disabled, save billing silently then proceed
        if (cfg.disableBillingStep) {
            saveBillingSilent(function (resp) {
                onBillingDone(resp);
            });
        } else {
            if (cfg.shippingRequired) {
                loadShippingMethods();
            }
            loadPaymentMethods();
        }

        // Pay button: run chain (first click) or confirm order (after TOS shown)
        $('#kali-os-pay-btn').on('click', function () {
            if (state.readyToConfirm) {
                submitConfirmOrder();
            } else {
                runChain();
            }
        });

        // Shipping method change
        $(document).on('change', 'input[name="shippingoption"]', onShippingMethodSelected);

        // Watch address fields and refresh shipping on change
        watchAddressFields();
    }

    return { init: init };

}(jQuery));

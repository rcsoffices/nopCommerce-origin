(function ($, ssCore, ssEx) {

    window.themeSettings = {
        themeBreakpoint: 1024,
        isAccordionMenu: false
    };
	
	// newsletter popup code
	
	function openNewsletterPopup(showDontShowMessage) {

        if (showDontShowMessage) {
            $('.newspetter-popup-inputs').show();
        } else {
            $('.newspetter-popup-inputs').hide();
        }

        $('.newsletter-popup-overlay').fadeIn();
    }

    function setCookie(cname, cvalue, exdays) {
        var d = new Date();

        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));

        document.cookie = cname + "=" + cvalue + "; expires=" + d.toUTCString();
    }

    function getCookie(cname) {
        var name = cname + '=';
        var ca = document.cookie.split(';');

        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];

            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }

            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }

        return '';
    }

    function newsletterBox() {
        var newsletterSubscribeAjax = function (subscribe, newsletterBox) {
            newsletterBox.find('.subscribe-loading-progress').show();

            $.ajax({
                cache: false,
                type: 'POST',
                url: newsletterBox.attr('data-newsLetterSubscribeUrl'),
                data: {
                    'subscribe': subscribe,
                    'email': newsletterBox.find('.newsletter-subscribe-text').val()
                }
            }).done(function (data) {
                newsletterBox.find('.subscribe-loading-progress').hide();

                newsletterBox.find('.newsletter-result-block').html(data.Result);

                if (data.Success) {
                    newsletterBox.find('.newsletter-subscribe-block').hide();
                    newsletterBox.find('.newsletter-result-block').show();
                } else {
                    newsletterBox.find('.newsletter-result-block').fadeIn('slow').delay(2000).fadeOut('slow');
                }
            }).fail(function () {
                alert('Failed to subscribe.');
                newsletterBox.find('.subscribe-loading-progress').hide();
            });
        };

        $('.newsletter-subscribe-button').on('click', function () {
            var newsletterBox = $(this).closest('.newsletter');

            if (newsletterBox.attr('data-allowToUnsubscribe').toLowerCase() === 'true') {
                if (newsletterBox.find('.newsletter_subscribe').is(':checked')) {
                    newsletterSubscribeAjax(true, newsletterBox);
                } else {
                    newsletterSubscribeAjax(false, newsletterBox);
                }
            }
            else {
                newsletterSubscribeAjax(true, newsletterBox);
            }
        });

        $('.newsletter-subscribe-text').keydown(function (event) {
            if (event.keyCode === 13) {
                $(this).closest('.newsletter').find('.newsletter-subscribe-button').click();
                return false;
            }
        });
    }

    function handleNewsletterSubscribe() {
        var newsletterPopupOverlay = $('.newsletter-popup-overlay');

        if (newsletterPopupOverlay.length === 0) {
            return;
        }

        var newsletterPopupDelayString = newsletterPopupOverlay.attr('data-showPopupDelay');
        var newsletterCookie = getCookie('minimalThemeNewsletterCookie');

        if (newsletterCookie === '' && newsletterPopupDelayString != null) {
            var newsletterPopupDelay = parseInt(newsletterPopupDelayString) || 0;

            setTimeout(function () {
                openNewsletterPopup(true);
            }, newsletterPopupDelay);
        }

        $('.newsletter-popup').on('click', function (e) {
            e.stopPropagation();
        });

        $('.newsletter-box-button').on('click', function (e) {
            e.preventDefault();

            openNewsletterPopup(false);
        });

        $('.newsletter-popup-overlay, .newsletter-popup-overlay .close-popup').on('click', function (e) {
            e.preventDefault();

            if ($('.newsletter-popup .newsletter-popup-checkbox').is(':checked')) {
                setCookie('minimalThemeNewsletterCookie', 1, 5);
            }

            $('.newsletter-popup-overlay').fadeOut();
        });
    }
	
	// end newsletter popup code
	
	
	
	
	
	
	
	// handle header items open/close behavior on mobile resolutions
	function handleNavigationBarItemsClickOnMobile() {

		$('.search-wrap span, .personal-button').off('click'); // prevent the core script from altering the elements
		
		var searchDropdown = $('.store-search-box');
		var preferencesDropdown = $('.header-links-wrapper');
		var overlayCanvas = $('.overlayOffCanvas');
		
		// do not change the sequence of any of the inner code bellow
		
        $('.search-wrap').on('click', function () {
            if (ssCore.getViewPort().width <= window.themeSettings.themeBreakpoint) {
				
				searchDropdown.toggleClass('open');
				if (!preferencesDropdown.hasClass('open')) {
					overlayCanvas.toggleClass('show').fadeIn();
				}
				if (!searchDropdown.hasClass('open')) { // negative condition because the "open" class is already toggled (removed)
					overlayCanvas.removeClass('show').fadeOut();
				}
                preferencesDropdown.removeClass('open');	
            }
        });
		
        $('.personal-button').on('click', function () {
            if (ssCore.getViewPort().width <= window.themeSettings.themeBreakpoint) {
				
				preferencesDropdown.toggleClass('open');
				if (!searchDropdown.hasClass('open')) {
					overlayCanvas.toggleClass('show').fadeIn();
				}
				if (!preferencesDropdown.hasClass('open')) { // negative condition because the "open" class is already toggled (removed)
					overlayCanvas.removeClass('show').fadeOut();
				}
                searchDropdown.removeClass('open');
            }
        });
		
		$('.menu-title').on('click', function () {
            if (ssCore.getViewPort().width <= window.themeSettings.themeBreakpoint) {
				
                searchDropdown.removeClass('open');
				preferencesDropdown.removeClass('open');
            }
        });
		
		$(document).on('themeBreakpointPassed7Spikes', function (e) {
		
			searchDropdown.removeClass('open');
			preferencesDropdown.removeClass('open, activeState');
			overlayCanvas.removeClass('show').fadeOut();
		});
    }

	
	// handle header items open/close behavior on desktop resolutions
    function handleHeaderItemsClickOnDesktop() {

        $('.personal-button').on('click', function () {
            if (ssCore.getViewPort().width > window.themeSettings.themeBreakpoint) {

                $(this).toggleClass('activeState');
                $('.header-links-wrapper').toggleClass('activeState');
                $('.flyout-cart, .shopping-cart-link').removeClass('activeState');
            }
        });

        $('.shopping-cart-link').on('click', function () {
            if (ssCore.getViewPort().width > window.themeSettings.themeBreakpoint) {

                $(this).toggleClass('activeState');
                $('.flyout-cart').toggleClass('activeState');
                $('.header-links-wrapper, .personal-button').removeClass('activeState');
            }
        });

		//if is desktop stop href
        $('.shopping-cart-link > a').on('click', function (e) {
            if (ssCore.getViewPort().width > window.themeSettings.themeBreakpoint) {
                e.preventDefault();
            }
        });

        //close both flyout cart and header links when click outside them
        $(document).mouseup(function (e) {

            var container = $(".flyout-cart, .header-links-wrapper, .shopping-cart-link, .personal-button ");

            if (!container.is(e.target) && container.has(e.target).length === 0)
            {
                container.removeClass('activeState');
            }
        });

        //desktop mobile menu submenu open/close  
        $('.header.mobile ~ .header-menu-parent .show-submenu').on('click', function () {

            if (ssCore.getViewPort().width > window.themeSettings.themeBreakpoint) {
                $(this).parent().siblings('div').stop().toggleClass('show');
            }
        });
    }
	
	
	// "mobile" Mega Menu on desktop to behave identically as Top Menu
    function handleMobileMegaMenuOnDesktop() {

        if ($('.mega-menu').length) {	
			$('.mega-menu > .has-sublist').each(function() {
				$(this).children('.with-subcategories').wrap('<div class="openSublistWrapper"></div>').before('<span class="show-submenu left"></span>').after('<span class="show-submenu right"></span>');
			});
			// bellow is additional code for toggle sublists as the original code doesn't target the newly added elements
			$('.header.mobile ~ .header-menu-parent .show-submenu').on('click', function () {
				if (ssCore.getViewPort().width > window.themeSettings.themeBreakpoint) {
					$(this).parent().siblings('div').stop().toggleClass('show');
				}
			});
        }
    }
	
	
	// there is no enough space for the normal header menu between 1024 and 1366px so the mobile menu is used instead.
	// the "active" class coming from the core script is overriden via css (because it works on hover) so a new class is used (on click).
	function handleNormalHeaderMenu() {
		
		if (ssCore.getViewPort().width > window.themeSettings.themeBreakpoint) {
			
			$('.plus-button').on('click', function (e) {

				e.stopPropagation(); 
				var sublist = $(this).siblings('.sublist-wrap');

				if (sublist.hasClass('opened')) {
					sublist.removeClass('opened');
				}
				 else {
					sublist.addClass('opened');
				}
			});
			$('.back-button').on('click', function () {
				$(this).closest('.sublist-wrap').removeClass('opened');
			});
		}
		/*$(window).on('resize', function() {
			if (ssCore.getViewPort().width > 1346) {
				$('.header-menu').removeClass('open');
				$('.sublist-wrap').removeClass('active, opened');
			}
		});*/ /*hides the mobile menu when the browser is resized upwards and then downwards, uncomment to use*/
		
		$(document).on('themeBreakpointPassed7Spikes', function (e) {
			$('.header-menu').removeClass('open');
			$('.sublist-wrap').removeClass('active, opened');
		});
	}
	

    // sets the offset of the header links and search box
    function setSearchBoxAndHeaderLinksPosition() {
		
		if (ssCore.getViewPort().width <= window.themeSettings.themeBreakpoint) {

			var headerStoreTheme = $('.header-storetheme').outerHeight();
			var adminHeaderLinksHeight = $('.admin-header-links').outerHeight();
			var headerHeight = $('.header').outerHeight();

			var dropdownTopOffset = headerStoreTheme + adminHeaderLinksHeight + headerHeight;

			if ($('.responsive-nav-wrapper').hasClass('stick')) {
				dropdownTopOffset = $('.responsive-nav-wrapper-parent').outerHeight();
			}	

			$('.search-box.store-search-box, .header-links-wrapper').css('top', dropdownTopOffset);
			
			$('.personal-button, .flyout-cart').removeClass('activeState');
		}
		else {
			$('.search-box.store-search-box, .header-links-wrapper').removeAttr('style');
		}
    }
    $(document).on("navigationHasSticked", function () {
        setSearchBoxAndHeaderLinksPosition(false); // recalculate the top offset depending on whether the navigation has sticked or not
    });	
	function handleSearchBoxAndHeaderPositions() {
        $('.search-wrap').on('click', function () {
            setSearchBoxAndHeaderLinksPosition();
        });
        $('.personal-button').on('click', function () {
            setSearchBoxAndHeaderLinksPosition();
        });
        $(window).on('resize', setSearchBoxAndHeaderLinksPosition);
    }
	
	
	// handle flyout cart quantity marker and scroll
	var handleTopCartLink = function (data) {
        $('.shopping-cart-link').toggleClass('full', data.items > 0);
    };	
	function setFlyoutCartScroll() {

        var miniShoppingCart = $('.mini-shopping-cart');
		var miniShoppingCartItems = miniShoppingCart.children('.items');

        if (miniShoppingCart.length === 0) {
            return;
        }
        miniShoppingCartItems.perfectScrollbar({
            swipePropagation: false,
            wheelSpeed: 1,
            suppressScrollX: true
        });
    }
	$('.header').on('click', '.shopping-cart-link', function () {
		setFlyoutCartScroll();
	});
	
	
	// handle the height of the item-box hover panel in grids on product pages and shopping cart page
	
	function setAlternateHoverPanelHeight() {
		$('.product-details-page .item-box .buttons, .shopping-cart-page .item-box .buttons').each(function () {
			if (ssCore.getViewPort().width > window.themeSettings.themeBreakpoint) {
				$(this).height($(this).outerWidth() + 1);
			}
			else {
				$(this).height('auto');
			}
		});
	}
	$(window).on('resize', function () {
		setAlternateHoverPanelHeight();
	});
	

	// Set dynamic height for item-box "buttons" overlay panel in jCarousel
	
	$(document).on('newProductsAddedToPageEvent', function () {
        var setOverlayHeight = function () {
            $('.nop-jcarousel.product-grid .item-box').each(function () {
				if (ssCore.getViewPort().width > window.themeSettings.themeBreakpoint) {
					var pictureHeight = $(this).find('.picture').outerHeight();
					$(this).find('.buttons').height(pictureHeight);
				}
				else {
					$(this).find('.buttons').height('auto');
				}
            });
        };
        setOverlayHeight();
        $(window).on('resize', function () {
			setTimeout(setOverlayHeight, 500);
        });
    });

    //owl carousel for home page news
    function handleHomePageNewsCarousel(numberOfItemsToRotate) {

        var newsCarousel = $('.news-list-homepage .news-items');

        if (newsCarousel.length === 0) {
            return;
        }

        newsCarousel.owlCarousel({
            loop: true,
            autoplay: true,
            autoplayHoverPause: true,
            nav: true,
            dots: false,
            margin: 5,
            responsive: {
                0: {
                    items: 1
                },
				1000: {
                    items: 2
                },
                1281: {
                    items: numberOfItemsToRotate
                }
            }
        });
    }

    // add custom tooltips when hover over the buttons in the product box when the hover-effect-2 is being set.
    // the reason for the check against the hover-effect-2 to be in the actual events is because of the theme roller
    // which changes the hover effect via js and not triggering the document.ready event
    function registerButtonsHoverEventForCustomTooltips() {

        $('.product-grid .quick-view-button a, .product-grid .product-box-add-to-cart-button, .product-grid .add-to-wishlist-button, .product-grid .add-to-compare-list-button').hover(
            function () {

                if (!$("body").hasClass("hover-effect-2")) {
                    return;
                }

                var tooltipText = $(this).attr('title');
                if (tooltipText.length > 0) {
                    $(this).attr('title', '');
                    $(this).parents(".buttons").find(".tooltip-text").text(tooltipText);
                }
            },
            function () {

                if (!$("body").hasClass("hover-effect-2")) {
                    return;
                }

                var tooltipText = $(this).parents(".buttons").find(".tooltip-text").text();
                if (tooltipText.length > 0) {
                    $(this).attr('title', tooltipText);
                    $(this).parents(".buttons").find(".tooltip-text").text("");
                }
        });
    }

    // Plus, Minus Quantity buttons 
    function incrementQuantityValue(event) {
        event.preventDefault();
        event.stopPropagation();

        var input = $(this).siblings('.qty-input, .productQuantityTextBox').first();

        var value = parseInt(input.val());
        if (isNaN(value)) {
            input.val(1);
            return;
        }

        value++;
        input.val(value);
    }

    function decrementQuantityValue(event) {
        event.preventDefault();
        event.stopPropagation();

        var input = $(this).siblings('.qty-input, .productQuantityTextBox').first();

        var value = parseInt(input.val());

        if (isNaN(value)) {
            input.val(1);
            return;
        }

        if (value <= 1) {
            return;
        }

        value--;
        input.val(value);
    }

    // increase and decrease product quantity
    function initializeProductQuantityIncreaseAndDecreaseFunctionality() {

        // Normal & Ajax Cart
        $('.item-box').off('click.increment').on('click.increment', '.plus', incrementQuantityValue).off('click.decrement').on('click.decrement', '.minus', decrementQuantityValue);
        $('.ajaxCart').off('click.increment').on('click.increment', '.plus', incrementQuantityValue).off('click.decrement').on('click.decrement', '.minus', decrementQuantityValue);
        $('.variant-overview').off('click.increment').on('click.increment', '.plus', incrementQuantityValue).off('click.decrement').on('click.decrement', '.minus', decrementQuantityValue);
        $('.overview').off('click.increment').on('click.increment', '.plus', incrementQuantityValue).on('click.decrement', '.minus', decrementQuantityValue);

        // Home Page Categories Tabs Normal & Ajax Cart
        $('.home-page-category-tabs').off('click.increment').on('click.increment', '.plus', incrementQuantityValue).off('click.decrement').on('click.decrement', '.minus', decrementQuantityValue);

        // Quick View
        $('.quickView').off('click.increment').on('click.increment', '.plus', incrementQuantityValue).off('click.decrement').on('click.decrement', '.minus', decrementQuantityValue);
    }

    //toggle footer box
    function handleFooterBlocksClickOnMobile() {

        $('.footer-middle-block > .title').on('click', function () {

            if (ssCore.getViewPort().width <= 768) {
                $(this).siblings('div, ul').stop().slideToggle();
            }
        });
    }
	
	// prevent catalog nav boxes from rendering opened on desktop resolutions 
	$(document).on('themeBreakpointPassed7Spikes', function (e) {
		$('.listbox').removeAttr('style');
	});

    // when having a cloud zoom and carousel with thumbs, the selected picture should have a specific class
    function handleCloudZoomSelectedElement() {

        if ($('.sevenspikes-cloudzoom-gallery').length) {
            $('.cloud-zoom-gallery:first').addClass('active');

            $('.cloud-zoom-gallery').on('click', function () {
                if ($(this).hasClass('active')) {
                    return;
                }
                else {
                    $('.cloud-zoom-gallery').removeClass('active');
                    $(this).addClass('active');
                }
            });
        }
    }
	
	// set the height of the vertical CloudZoom carousel to be equal to the height of the main product image
	// this doesn't work on initial load or ctrl+F5 as the main image is not ready. this function is currently disabled
	/*function setCloudZoomVerticalCarouselHeight() {

		var targetElement = $('.sevenspikes-cloudzoom-gallery .slick-vertical');
        if (targetElement.length > 0) {
			targetElement.height($('.gallery .picture').height());
        }
    }
	$(window).on('resize', setCloudZoomVerticalCarouselHeight);*/

    // when choosing a product review rating, change the color of all previous stars, so that it indicates better the rating. For example choose rating 3 and change the color of the first three 
    /*function handleProductReviewRatingsStarsOnSelect() {

        $(document).on('click', '.write-review .review-rating input[type="radio"]', function () {
            $('input:not(:checked)').parent().removeClass("checked");
            $('input:checked').parent().addClass("checked").prevAll().addClass("checked");
        });
    }*/

    // collapse side blocks on click for both one and two columns layout
    function addSideBlocksClickEvents() {

        var slideSiblings = function (element) {
            $(element).siblings().stop().slideToggle('slow', function () {
                $(this).css('overflow', '');
            });
        };

        $('.blog-block-wrapper .block .title').not($('.nopAjaxFilters7Spikes .block .title')).off('click').on('click', function () {
            slideSiblings(this);
        });
        $('.block .title').not($('.nopAjaxFilters7Spikes .block .title, .blog-block-wrapper .block .title')).off('click').on('click', function () {

            var viewPortWidth = ssCore.getViewPort().width;
            if ($('.center-side-wrapper').hasClass('onecolumn') && viewPortWidth > window.themeSettings.themeBreakpoint) {
                slideSiblings(this);
            }
            // if two columns layout, enable collapsing the blocks between the theme breakpoint until 1280px in which the side-2 columns are still collapsible
            else if ($('.center-side-wrapper').hasClass('twocolumns') && viewPortWidth > window.themeSettings.themeBreakpoint && viewPortWidth <= 1280) {
                slideSiblings(this);
            }
            else if (viewPortWidth <= window.themeSettings.themeBreakpoint) {
                slideSiblings(this);
            }
        });
    }
	
	// expand filter blocks in side column (collapsed by default)
    function expandFiltersInSideColumn(areFiltersCollapsed) {

        if (areFiltersCollapsed) {
            var viewPortWidth = ssCore.getViewPort().width;

            if (viewPortWidth < 1025 || viewPortWidth > 1280) {
                $('.nopAjaxFilters7Spikes .block').each(function () {

                    if ($(this).hasClass('wasCollapsed')) {
                        $(this).children().eq(1).hide();
                        $(this).children().eq(0).children('a.toggleControl').addClass('closed');
                    }
                    else {
                        $(this).children().eq(1).show();
                        $(this).children().eq(0).children('a.toggleControl').removeClass('closed');
                    }
                });
            }
            else
            {
                $('.nopAjaxFilters7Spikes .block').each(function () {

                    $(this).children().eq(1).hide();
                    $(this).children().eq(0).children('a.toggleControl').addClass('closed');
                });
            }
        }
       
    }
	
	// in twocolumns layout, move the filters from side-2 to center-2 for resolutions between 1024 and 1280px
	// (because there is no side column below 1280px)
	
	function handleSide2FiltersOnDesktop() {
		
		var ajaxFilters = $('.twocolumns .nopAjaxFilters7Spikes');
		ajaxFilters.detach();
		
		function calculateViewPort() {
			var viewPortWidth = ssCore.getViewPort().width;
			if(viewPortWidth > 1024 && viewPortWidth <= 1280) {
				ajaxFilters.prependTo('.center-2');
			}
			else if(viewPortWidth > 1280) {
				ajaxFilters.prependTo('.side-2');
			}
		}
		calculateViewPort();
		$(window).on('resize', calculateViewPort);
	}

    function handleRichBlogImageOnBlogListPage() {

		var setPadding = function () {
			$('.blog-page .post').each(function () {
				var imageHeight = $(this).children('.rich-blog-image').outerHeight(true);
				if(ssCore.getViewPort().width > 1024) {
					$(this).css('padding-top', imageHeight);
				}
				else {
					$(this).css('padding-top', 30);
				}
			});
		};
		setPadding();
		$(window).on('resize', setPadding);
    }
	
	function setOrderTotalTablePadding() {
		setTimeout(function() {
			var totalPriceLine = $('tr.order-total');
			totalPriceLine.prev('tr').addClass('order-total-before');
			totalPriceLine.next('tr').addClass('order-total-after');
		}, 500);
	}
	
	function equalizeFrameHeight() {
		var target = $('.gdpr-tools-page .form-fields');
		var frameHeight = 0;
		target.each(function () {
			if($(this).outerHeight() > frameHeight) {
				frameHeight = $(this).outerHeight();
			}
		});
		target.height(frameHeight);
	}

    $(document).ready(function () {

        var responsiveAppSettings = {
            isEnabled: true,
            themeBreakpoint: window.themeSettings.themeBreakpoint,
            isSearchBoxDetachable: true,
            isHeaderLinksWrapperDetachable: false,
            doesDesktopHeaderMenuStick: true,
            doesScrollAfterFiltration: true,
            doesSublistHasIndent: true,
            displayGoToTop: true,
            hasStickyNav: true,
            selectors: {
                menuTitle: ".menu-title",
                headerMenu: ".header-menu",
                closeMenu: ".close-menu",
                sublist: ".header-menu .sublist",
                overlayOffCanvas: ".overlayOffCanvas",
                withSubcategories: ".with-subcategories",
                filtersContainer: ".nopAjaxFilters7Spikes",
                filtersOpener: ".filters-button span",
                searchBoxOpener: ".search-wrap > span",
                searchBox: ".store-search-box",
                searchBoxBefore: ".responsive-nav-wrapper",
                navWrapper: ".responsive-nav-wrapper",
                navWrapperParent: ".responsive-nav-wrapper-parent",
                headerLinksOpener: "#header-links-opener",
                headerLinksWrapper: ".header-links-wrapper",
                //headerLinksWrapperMobileInsertAfter: ".responsive-nav-wrapper-parent",
                //headerLinksWrapperDesktopPrependTo: ".header",
                shoppingCartLink: ".shopping-cart-link",
                overlayEffectDelay: 300
            }
        };

        ssEx.initResponsiveTheme(responsiveAppSettings);

        //toggle footer box
        handleFooterBlocksClickOnMobile();

        // click to close (search, header links and mobile menu )
        handleNavigationBarItemsClickOnMobile();
       
        //open/close search, header links, flyout
        handleHeaderItemsClickOnDesktop();
		
		// handle the normal header menu being replace with the mobile one
		handleNormalHeaderMenu();

        // handle the position of the header links and search box
        handleSearchBoxAndHeaderPositions();

        var cartItems = parseInt($('#topCartLinkHidden').attr('data-cartItems')) || 0;
        handleTopCartLink({ items: cartItems });
        $(document).on('flyoutCartReloadedEvent', handleTopCartLink);

        //home page news carousel
        handleHomePageNewsCarousel(3);
        
        // CUSTOM SELECTS
        $(".product-selectors select, .theme-selector select, .store-search-box.with-caregory-search-enabled select, select").not('.header-storetheme #browse-other-themes, .ropc select').simpleSelect();

        //CloudZoom selected element
        handleCloudZoomSelectedElement();
		
		//Newsletter popup
		newsletterBox();
        handleNewsletterSubscribe();
		
		//setCloudZoomVerticalCarouselHeight();
		
		// Dynamic height for hover panels on product pages and shopping cart page
		setAlternateHoverPanelHeight();

        //buttons tooltips
        registerButtonsHoverEventForCustomTooltips();
        $(document).on('nopQuickViewButtonsAddedCompleteEvent', registerButtonsHoverEventForCustomTooltips);

        // increase and decrease product quantity
        initializeProductQuantityIncreaseAndDecreaseFunctionality();

        //product ratings 
        //handleProductReviewRatingsStarsOnSelect();
        
        //mega menu mobile arrows for submenu
        handleMobileMegaMenuOnDesktop();

        //collapse block elements on click
        addSideBlocksClickEvents();
    
        //richBlog image on blog list page
        handleRichBlogImageOnBlogListPage();
		
		//sets additional class names inside "order total" table
		setOrderTotalTablePadding();

        // when we have two columns layout, the filters are moved from the left side to the center of the page between 1000px and 1280 px
        if ($('.center-side-wrapper').hasClass('twocolumns')) {

            //Required in order to save the initial state of the filters closed or opened
            $('.nopAjaxFilters7Spikes .block').each(function () {
                if ($(this).find('.toggleControl').hasClass('closed')) {
                    $(this).addClass('wasCollapsed');
                }
            });

            var areFiltersCollapsed = false;
            if ($('.nopAjaxFilters7Spikes') != undefined && $('.nopAjaxFilters7Spikes .block .title .toggleControl').hasClass('closed')) {
                areFiltersCollapsed = true;
            }
			
			expandFiltersInSideColumn(areFiltersCollapsed);

            ssEx.addWindowEvent("resize", function () { expandFiltersInSideColumn(areFiltersCollapsed); });
            ssEx.addWindowEvent("orientationchange", function () { expandFiltersInSideColumn(areFiltersCollapsed); });
        }
		
		// move the filters from side-2 to center-2 for twocolumns layout
        handleSide2FiltersOnDesktop();
        
        $('.shopping-cart-link').toggleClass('full', $('.flyout-cart .items').length > 0);
    });//end document ready

    // call it when the ajax cart replace buttons is complete, so that we subscribe to the new buttons hover effect
    $(document).on("nopAjaxCartButtonsAddedEvent", function () {
        registerButtonsHoverEventForCustomTooltips();
    });

    // call it when the quick tabs review view is refreshed via ajax(when trying to leave a review and a server side validation occurs, the markup is replaced with the result)
    $(document).on("quickTabsRefreshedTab", function () {
        handleProductReviewRatingsStarsOnSelect();
    });

    // register the click events for the increment and decrement product quantity 
    $(document).on("nopAjaxFiltersFiltrationCompleteEvent", function () {
        initializeProductQuantityIncreaseAndDecreaseFunctionality();
    });

    // the theme uses the responsive nav wrapepr for both desktop and mobile, so when swithing to mobile resolutions from desktop one, 
    // remove the added classes if the my account and shopping cart links from the header have been clicked on dekstop
    $(document).on('themeBreakpointPassed7Spikes', function (e) {
        if (e.isMobileResolution) {
            // mobile
            $('.store-search-box, .header-links-wrapper').removeClass('open');
            $('.overlayOffCanvas').hide().removeClass('show');
        }
    });
	
	// Equalizes form-fields height on GDPR page
	equalizeFrameHeight();

})(jQuery, sevenSpikesCore, sevenSpikesEx);
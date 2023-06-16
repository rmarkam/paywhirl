window._paywhirl = window._paywhirl || {
	autoLaunchHandled: false,
	autoScrollHandled: false,
	initialized: false,
	jQuery: null,
	frameOpts: {}
};

_paywhirl.setupAnimatedLoader = function() {
	var rules = " \
		.paywhirl-modal.paywhirl-loading .tingle-modal-box__content { \
			background: url(https://app.paywhirl.com/images/loading.gif) 50% 50% no-repeat; \
			height: 300px; \
			overflow: hidden; \
		} \
		\
		.paywhirl-modal.paywhirl-loading iframe { \
			opacity: 0; \
		} \
	";

	var node = document.createElement('style');
	node.appendChild(document.createTextNode(rules));
	document.head.appendChild(node);
};

_paywhirl.debug = function(){
	try {
		var args = Array.prototype.slice.call(arguments);
		window.console.debug.apply(this, ['PayWhirl:'].concat(args));
	} catch (err) {
		// pass
	}
}

_paywhirl.scrollTo = function(top) {
	if (!_paywhirl.jQuery) {
		return;
	}

	_paywhirl.jQuery('html, body').animate({ scrollTop: top }, 'slow');
}

_paywhirl.createIframe = function(id) {
	var iframe = document.createElement('iframe');

	iframe.id= 'pwframe_'+id;
	iframe.className = 'paywhirl_frame';
	iframe.name = id;

	iframe.frameborder = '0';
	iframe.scrolling = 'no';
	iframe.setAttribute('allowtransparency', 'true');
	iframe.setAttribute('allow', 'payment');

	iframe.style.width = '100%';
	iframe.style.border = '0';

	return iframe;
}

_paywhirl.insertAfter = function(node, referenceNode) {
	referenceNode.parentNode.insertBefore(node, referenceNode.nextSibling);
}

_paywhirl.handleMessage = function(evt) {
	// _paywhirl.debug('Received message:', evt.data);

	if (evt.data.source !== 'paywhirl') {
		return;
	}

	var method = evt.data.method;

	// Handle messages not depending on jQuery
	if (method === 'hide-loader') {
		var elems = document.getElementsByClassName('paywhirl-loading');
		for (var i = 0; i < elems.length; ++i) {
			elems[i].className = elems[i].className.replace('paywhirl-loading', '');
		}
		return;
	}

	if (method === 'set-height' && evt.data.height > 0) {
		var iframe = document.getElementById('pwframe_' + evt.data.frame);
		iframe.style.height = evt.data.height + 'px';
		// _paywhirl.debug('Adjusted widget height to ' + evt.data.height + 'px');
		return;
	}

	if (!_paywhirl.jQuery) {
		return;
	}

	// Handle messages depending on jQuery

	var frame = _paywhirl.jQuery('#pwframe_' + evt.data.frame);
	var opts = _paywhirl.frameOpts[evt.data.frame] || {};

	if (method === 'scroll-to' && opts.autoScroll) {
		_paywhirl.scrollTo(frame.offset().top + evt.data.offset - (opts.autoScroll > 1 ? opts.autoScroll : 0));

		return;
	}

	if (method === 'forced-scroll') {
		_paywhirl.scrollTo(frame.offset().top + evt.data.offset);

		return;
	}

	if (method === 'auto-scroll' && frame.is(':visible')) {
		if (evt.data.initial && _paywhirl.autoScrollHandled) {
			return;
		}

		if (evt.data.initial) {
			_paywhirl.autoScrollHandled = true;
		}

		var autoscroll = evt.data.initial ? opts.initialAutoScroll : opts.autoScroll;

		if (autoscroll) {
			_paywhirl.scrollTo(frame.offset().top - (autoscroll > 1 ? autoscroll : 60));
		}

		return;
	}
}

_paywhirl.loadJQuery = function() {
	var script = document.createElement('script');

	script.type='text/javascript';
	script.async=false;
	script.onload = function() {
		_paywhirl.jQuery = jQuery.noConflict(true);
		_paywhirl.jQuery('.pw_loading').hide();
		_paywhirl.debug('Finished loading jQuery');
	};
	script.src='https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js';

	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(script, s);

	_paywhirl.debug('Started loading jQuery');
}

_paywhirl.initialize = function() {
	if (_paywhirl.initialized) {
		return;
	}

	_paywhirl.initialized = true;

	_paywhirl.loadJQuery();
	_paywhirl.setupAnimatedLoader();
	window.addEventListener('message', _paywhirl.handleMessage, false);
}

_paywhirl.updateFrameOpts = function(id, action, userOpts) {
	var opts = _paywhirl.frameOpts[id] || {};

	opts.autoScroll = (typeof(userOpts.autoscroll) !== 'undefined' && action !== 'button')
		? userOpts.autoscroll
		: 0;

	opts.initialAutoScroll = (typeof(userOpts.initial_autoscroll) !== 'undefined' && action !== 'button')
		? userOpts.initial_autoscroll
		: opts.autoScroll;

	_paywhirl.frameOpts[id] = opts;
}

_paywhirl.frameUrl = function(path, opts, with_main_url, with_parent_params) {
	var domain = (typeof(opts.domain) == "undefined") ? opts : opts.domain;
	var url = 'https://'+domain+'.paywhirl.com' + path + '?layout=embed';

	if (opts.multiauth) {
		url = url + '&multiauth=' + opts.multiauth;
	}

	if (opts.sortable) {
		url += '&sortable=1';
	}

	if (with_main_url) {
		try {
			url = url + '&main_url=' + encodeURIComponent(top.location.href);
		} catch (err) {
			// pass
		}
	}

	if (with_parent_params) {
		var parent_params = window.location.search.replace("?", "");
		if (parent_params !== '') {
			url = url + '&' + parent_params;
		}
	}

	return url;
}

function paywhirl(action,opts,id){
	_paywhirl.initialize();
	_paywhirl.updateFrameOpts(id, action, opts);

	var currentTag = document.getElementById(id);

	if( action !== 'modal_cart' && action !== 'button' && !_paywhirl.jQuery) {
		var loading = document.createElement('img');
		if(typeof(opts.loading_image) !== 'undefined' && typeof(opts.loading_image.trim) === 'function' && opts.loading_image.trim() !== ''){
			loading.src = opts.loading_image;
		} else {
			loading.src = "https://app.paywhirl.com/images/loading.gif";
		}
		loading.style = "display:block; margin:auto; margin-bottom:0px;";
		loading.className = "pw_loading";
		_paywhirl.insertAfter(loading, currentTag);
		currentTag = loading;
	}

	if(action=='create'){

		var iframe = _paywhirl.createIframe(id);
		iframe.src = _paywhirl.frameUrl('/login', opts, true, true);
		iframe.style['min-height'] = '800px';

		_paywhirl.insertAfter(iframe, currentTag);
	}

	if(action=='widget'){

		var iframe = _paywhirl.createIframe(id);
		iframe.src = _paywhirl.frameUrl('/widget/' + opts.uuid, opts, true, true);
		iframe.style['min-height'] = '600px';

		_paywhirl.insertAfter(iframe, currentTag);
	}

	if(action=='cart'){

		var iframe = _paywhirl.createIframe(id);
		iframe.src = _paywhirl.frameUrl('/cart', opts, true, true);
		iframe.style['min-height'] = '600px';

		_paywhirl.insertAfter(iframe, currentTag);
	}

	if(action=='modal_cart'){
		var modal = null;
		//add tingle
		var stylesheet = document.createElement('link');
		stylesheet.rel = "stylesheet";
		stylesheet.type = "text/css";
		stylesheet.href = 'https://'+opts.domain+'.paywhirl.com/css/tingle.css';
		_paywhirl.insertAfter(stylesheet, document.getElementsByTagName('script')[0]);

		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.async = false;
		script.src = 'https://'+opts.domain+'.paywhirl.com/js/tingle.js';
		script.addEventListener('load', function () {
			if( typeof tingle !== 'undefined' ) {
				modal = new tingle.modal();
				pwModalCart(modal, opts, id);
			} else {
				setTimeout(function(){
					modal = new tingle.modal();
					pwModalCart(modal, opts, id);
				}, 100);
			}
		}, false);
		_paywhirl.insertAfter(script, stylesheet);
	}

	if(action=='button'){
		var iOS12minus = false;
		try {
			if (/iP(hone|od|ad)/.test(navigator.platform)) {
				// supports iOS 2.0 and later: <https://bit.ly/TJjs1V>
				var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
				if (parseInt(v[1]) <= 12) {
					iOS12minus = true;
				}
			}
		} catch(e) {
			_paywhirl.debug(e);
		}

		var modal = null, stylesheet = null, script = null;

		if(!iOS12minus) {
			var modalOpts = { cssClass: ['paywhirl-modal'] };

			//add tingle
			stylesheet = document.createElement('link');
			stylesheet.rel = "stylesheet";
			stylesheet.type = "text/css";
			stylesheet.href = 'https://'+opts.domain+'.paywhirl.com/css/tingle.css';
			_paywhirl.insertAfter(stylesheet, currentTag);

			script = document.createElement('script');
			script.type = 'text/javascript';
			script.async = false;
			script.src = 'https://'+opts.domain+'.paywhirl.com/js/tingle.js';
			script.addEventListener('load', function () {
				if( typeof tingle !== 'undefined' ) {
					modal = new tingle.modal(modalOpts);
				} else {
					setTimeout(function(){
						modal = new tingle.modal(modalOpts);
					}, 100);
				}
			}, false);
			_paywhirl.insertAfter(script, stylesheet);
		}

		function showWidget() {
			var url = _paywhirl.frameUrl('/widget/' + opts.uuid, opts, true, true);

			url += '&popup=1';

			if (opts.subscription_id) {
				url += '&subscription_id=' + opts.subscription_id;
			}

			if(iOS12minus) {
				window.open(url);
				return;
			};

			if(!modal) {
				setTimeout(showWidget, 200);
				return;
			}

			var iframe = _paywhirl.createIframe(id);
			iframe.style['min-height'] = '300px';
			iframe.src = url;

			modal.modal.classList.add('paywhirl-loading');
			modal.setContent(iframe);
			modal.open();
		}

		//create button link
		var buttonLink = document.createElement('a');
		buttonLink.href = "javascript:void(0);";
		buttonLink.onclick = showWidget;

		//create button
		if(typeof(opts.button_text) !== 'undefined' && typeof(opts.button_text.trim) === 'function' && opts.button_text.trim() !== ''){
			var button = document.createElement('span');
			button.innerText = opts.button_text;
		} else {
			var button = document.createElement('img');
			if(typeof(opts.button_image) !== 'undefined' && typeof(opts.button_image.trim) === 'function' && opts.button_image.trim() !== ''){
				button.src = opts.button_image;
			} else {
				button.src = 'https://'+opts.domain+'.paywhirl.com/pwtheme/images/buy_button.svg';
			}
			button.className = "pw-buy-btn";
			button.style = "margin:10px; cursor:pointer; max-width:180px;";
		}

		buttonLink.appendChild(button);

		//add button to page
		_paywhirl.insertAfter(buttonLink, currentTag);

		document.addEventListener("DOMContentLoaded", function() {
			if (location.search.indexOf('pw-launch=' + opts.uuid) !== -1 && !_paywhirl.autoLaunchHandled) {
				_paywhirl.autoLaunchHandled = true;
				showWidget();
			}
		});
	}

	_paywhirl.debug("PayWhirl widget " + id + " loaded.");
}

function pwModalCart(modal, opts, id){
	if( !modal ) {
		return;
	}

	//add widget to modal
	var iframe = _paywhirl.createIframe(id);
	iframe.style['min-height'] = '600px';

	modal.setContent(iframe);
	modal.open();

	iframe.contentWindow.document.open();
	iframe.contentWindow.document.write('<html><body><img src="https://app.paywhirl.com/images/loading.gif" class="pw_loading" style="display:block; margin:auto; margin-bottom:-130px;" /></body></html>');
	iframe.contentWindow.document.close();

	var url = _paywhirl.frameUrl('/cart', opts, false, false);

	if (typeof(opts.shopify_cart) === 'object') {
		url += '&shopify_cart=' + encodeURIComponent(JSON.stringify(opts.shopify_cart));
	}

	iframe.src = url;
}

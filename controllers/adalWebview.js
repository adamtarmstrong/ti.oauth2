
var _prompt, _url, _action, _redirecturl, _callback, _allowClose, _onCancelCallback, addButton;
var myTimeoutVar;

/**
 * Opens the window and the contained webview to the past in URL.
 * while also setting up callback functions to check for Azure Authorization
 * success.
 * @private
 *
 * @param {String} url - The URL to open in the webview
 * @param {Function} callback - The callback function to handle asynchronous events
 */
function _open(prompt, url, customTitleText, action, redirectUrl, allowClose, onCancelCallback, callback){			"use strict";

	/**
	* May need a handle to this if the user hits "close"
	*/
	_url = url;
	_action = action;
	_redirecturl = redirectUrl;
	_callback = callback;
	_onCancelCallback = onCancelCallback;
	_prompt = prompt;
	_allowClose = allowClose;	//this handle is used for androidback eventListener

	/**
	* Navigate the webview to the correct oAuth2 login page
	*/
	if (_prompt) {
		$.win.opacity = 1;
	} else {
		$.win.opacity = 0;
	}
	showWindowAfterTimeout(13000);														//safety net.  after this many milliseconds, if still not authenitcated, then Dialog Win is set to visible.
	$.webview.url = url;
  
	callback && $.webview.addEventListener('beforeload', webviewBeforeLoad);

	if (OS_IOS) { 
		$.win.open();
		$.adalWidgetIosWindow.title = customTitleText;
		if (_allowClose) {
			addButton = Ti.UI.createButton({ systemButton: Ti.UI.iOS.SystemButton.CANCEL });
			addButton.addEventListener("click", _onClickCloseButton);
			$.adalWidgetIosWindow.leftNavButton = addButton;
		}
	} else if (OS_ANDROID) {
		setTimeout(function() { 
			$.win.open();
			$.win.title = customTitleText;
		}, 300);
	}
}

function webviewBeforeLoad(e){						"use strict";							
	if(e && e.url){	
		/**
		* Success, return the appropriate authCode
		*/
		if (_getParameterByName('code', e.url)) {
			clearTimeout(myTimeoutVar);													//cancels timeout - to show Window
        	var authCode = _getParameterByName('code', e.url);
			_callback && _callback(null, {code: authCode});
		/**
		* There is a an error with your AZure configuration, check the error and your setup.
		*/
		} else if(_getParameterByName('error', e.url)){
			$.win.opacity = 1;															//on error - show Auth Dialog Window
			var description = _getParameterByName('error', e.url) - _getParameterByName('error_description', e.url);
	        var err = new Error(description, 'adalWebview.js', 19);
			_callback && _callback(err);
		/**
		 * If logging out
		 */
		} else if ((e.url == _redirecturl) && (_action == "logout")) {
			//TODO: Need to workout a logout, session clearing, mechanism here.  For now - just closing
			_close();
		}
	}
}

function showWindowAfterTimeout(numMilliseconds){
	myTimeoutVar = setTimeout(function(){ 
		$.win.opacity = 1;
	}, numMilliseconds);
}


function _show(){
	$.win.opacity = 1;
}
/**
 * Public interface for the `_show` function.
 */
exports.show = _show;

function _hide(){
	$.win.opacity = 0;
}
/**
 * Public interface for the `_show` function.
 */
exports.hide = _hide;
  
/**
 * Public interface for the `_open` function.
 */
exports.open = _open;

/**
 * Closes the modal window and resets the webview url.
 * @private
 */
function _close(){										"use strict";
	$.webview.url = "";
	$.webview.removeEventListener('beforeload', webviewBeforeLoad);
	if (OS_IOS && _allowClose) {
		addButton.removeEventListener('click', _close);
		$.adalWidgetIosWindow.leftNavButton = null;
	}
	$.win.close();
}

/**
 * Public interface for the `_close` function.
 */
exports.close = _close;

/**
 * Closes the modal dialog and returns an User initated close result
 * @private
 */
function _onClickCloseButton(e){ 						"use strict";
	_onCancelCallback();
	_close();
}

/**
 * Helper function for retrieving query parameters from a URL.
 * @private
 *
 * @param {String} name - The name of the query parameter to fetch from the URL
 * @param {String} url  - The URL to check for the query parameter
 */
function _getParameterByName(name, url) {				"use strict";
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");				// This is just to avoid case sensitiveness for query parameter name
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

$.win.addEventListener("androidback", function() {		"use strict";
	if (_allowClose) { _onClickCloseButton(); }
});
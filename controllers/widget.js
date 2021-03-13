//Azure oAuth2 v 2.0 src:	https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-protocols-oauth-client-creds

var _clientId,     		// <-- GUID supplied by Azure
	_clientSecret, 		// <-- Azure calls this a Key in some places
	_tenant,       		// <-- Your tenant GUID or domain (if you have one)
	_state,       		// <-- Your tenant GUID or domain (if you have one)
	_responseType, 		// <-- Almost always going to be 'code' which is the default
	_resourceId,   		// <-- The Resource your trying to access.
	_redirectUrl,  		// <-- If you want to supply a different redirectURL go for it.
	_grant_type,   		// <-- For retrieving the bearer token, almost always going to be 'authorization_code'
	_scope,				// <-- Scope
	_customTitleText,	// <-- Custom Title on Login Window
	_customServer,		// <-- BOOL to determine use of Custom Server or MS/Azure Server
	_customAuthUrl,		// <-- Url to use for Custom Server Auth
	_customTokenUrl,		// <-- Url to use for Custom Server Token
	_customLogoutUrl,		// <-- Url to use for Cookies
	_customCookieUrl,		// <-- Url to use for Cookies
	_prompt,				// <-- Passed in during .authorize().  true - shows dialog on top of all Windows.   false - hides dialog
	_allowClose,			// <-- Passed in during .authorize().  used to determine whether to allow exit or not
	_cancelCallback,		// <-- Passed in during .authorize().  callback executed on cancel()

	// URLs used to access authorization and bearer tokens
	_azureAdalTenantAuthUrl = 'https://login.microsoftonline.com/%s/oauth2/v2.0/authorize?client_id=%s&response_type=%s&scope=%s&redirect_uri=%s',
	_azureAdalTenantTokenUrl = 'https://login.microsoftonline.com/%s/oauth2/v2.0/token',
	_azureAdalAuthUrl = 'https://login.microsoftonline.com/oauth2/v2.0/authorize?client_id=%s&response_type=%s&scope=%s&redirect_uri=%s',
	_azureAdalTokenUrl = 'https://login.microsoftonline.com/oauth2/v2.0/token';
_customAdalAuthUrl = '%s?client_id=%s&response_type=%s&scope=%s&redirect_uri=%s&state=%s',
	_customAdalTokenUrl = '%s';


// A handle to the WebView component of the widget.
var _adalWebView = Alloy.createWidget('ti.oauth2', 'adalWebview');

/**
 * Constructor for the Appcelerator oAuth2 widget
 * @constructor
 */
(function _constructor(_params) {
	_clientId = _params.client_id || null;
	_tenant = _params.tenant || null;
	_state = _params.state || Alloy.Globals.helper.makeGUID();
	_responseType = _params.responseType || 'code';
	_resourceId = _params.resourceId || null;
	_redirectUrl = _params.redirectUrl || null;
	_grantType = _params.grantType || 'authorization_code';
	_scope = _params.scope || null;
	_customTitleText = _params.customTitleText || "Login";
	_customServer = _params.customServer || false;
	_customAuthUrl = _params.customAuthUrl || null;
	_customTokenUrl = _params.customTokenUrlarams || null;
	_customLogoutUrl = _params._customLogoutUrl || null;
	_customCookieUrl = _params.customCookieUrl || null;
})($.args);

//Empty function used if a user forgets, or elects not, to define a function for onCancel. 
function empty() { console.info("EMPTY CALLBACK"); }

/**
 * Opens the WebView for authenticating against Azure AD.
 * @public
 */
function _authorize(prompt, _onSuccess, _onError, allowClose, _onCancel) {
	_allowClose = (allowClose) ? true : false;
	_prompt = (prompt) ? true : false;

	if (_onCancel === undefined) {
		_cancelCallback = empty;
	} else {
		_cancelCallback = _onCancel;
	}

	_getUserAuthorization(function (err, result) {
		if (err) {
			//_onError && _onError(err) || console.error(err.message);
			_onError(err) || console.error(err.message);
		} else {
			_getBearerToken(result.code, function (err, result) {
				if (err) {
					//_onError && _onError(err);
					_onError(err);
				} else {
					//_onSuccess && _onSuccess(result);
					_onSuccess(result);
				}
			});
		}
	});
}
exports.authorize = _authorize;

/**
 * Authenticates the user against Azure Active Directory and returns an
 * authorization code
 * @private
 */
function _getUserAuthorization(callback) {
	/**
	* Must have a _clientId, _responseType, _scope, AND _redirectUrl to proceed
	*/
	if (_clientId && _responseType && _scope && _redirectUrl) {
		/**
		* Format the URL correctly for those users with a tenant ID / domain.
		*/
		if (_customServer) {
			var url = String.format(_customAdalAuthUrl, _customAuthUrl, _clientId, _responseType, encodeURIComponent(_scope), encodeURIComponent(_redirectUrl), _state);
		} else {
			var url = _tenant ? String.format(_azureAdalTenantAuthUrl, _tenant, _clientId, _responseType, encodeURIComponent(_scope), encodeURIComponent(_redirectUrl)) :
				String.format(_azureAdalAuthUrl, _clientId, _responseType, encodeURIComponent(_scope), encodeURIComponent(_redirectUrl));
		}

		/**
		* Open the webview for the oAuth login.
		*/
		_adalWebView.open(_prompt, url, _customTitleText, "auth", _redirectUrl, _allowClose, _cancelCallback, function (err, result) {
			if (err) {
				/**
				* Ooops! We hit a roadbloack, make sure your configured right with Azure.
				*/
				console.info('WIDGET[ti.oauth2] Authorization Error');
				callback && callback(err);
			}
			else {
				console.info('WIDGET[ti.oauth2] Authorization Successful');
				callback && callback(null, result);
			}
		});
	} else {
		console.error("Missing Parameters.  Must provide clientId, responseType, scope and redirectUrl");
	}
}

/**
 * Log Out current user
 * @private
 */
function _logout(prompt, _onSuccess, _onError, allowClose, _onCancel) {
	_allowClose = (allowClose) ? true : false;
	_prompt = (prompt) ? true : false;

	if (_onCancel === undefined) {
		_cancelCallback = empty;
	} else {
		_cancelCallback = _onCancel;
	}

	if (_customLogoutUrl && _customCookieUrl) {

		const accessResponse = Ti.App.Properties.getObject('access-response');
		if (!accessResponse) {
			console.error("No ID-Token for logout");
			return;
		}

		var xhr = Ti.Network.createHTTPClient();
		xhr.clearCookies(_customCookieUrl);

		let logoutURL = _customLogoutUrl + "?id_token_hint=" + accessResponse.id_token;
		console.log(logoutURL);

		_adalWebView.open(_prompt, logoutURL, _customTitleText, "logout", _redirectUrl, _allowClose, _cancelCallback, function (err, result) {
			if (err) {
				console.info('WIDGET[ti.oauth2] Logout Error');
				_onError && _onError(err);
			}
			else {
				console.info('WIDGET[ti.oauth2] Logout Successful');
				_onSuccess && _onSuccess(null, result);
			}
		});
	} else {
		console.error("Missing Parameters.  Must provide customLogoutUrl and customCookieUrl");
	}

}
exports.logout = _logout;

/**
 * Retrieves the Azure Bearer Token
 * @private
 *
 * @param {String} _authCode - The authorization code returned by the authorize function
 */
function _getBearerToken(_authCode, callback) {
	if (_clientId && _authCode && _grantType) {
		/**
		* Format Token Url and Post Body params
		*/
		if (_customServer) {
			var tokenUrl = String.format(_customAdalTokenUrl, _customTokenUrl);
		} else {
			var tokenUrl = _tenant ? String.format(_azureAdalTenantTokenUrl, _tenant) : _azureAdalTokenUrl;
		}
		var bodyParms = {
			client_id: _clientId,
			scope: _scope,		// TODO: does this work on customServer ?
			code: _authCode,
			state: _state,
			redirect_uri: _redirectUrl,
			grant_type: _grantType,
			client_secret: _clientSecret
		};

		/**
		* Make Request to Azure for Bearer Token
		*/
		var xhr = Ti.Network.createHTTPClient({
			onload: function (e) {
				/**
				* Success! Return the access and refresh tokens to calling function
				*/
				if (this.status == 200) {
					var response = JSON.parse(this.responseText); console.info("ADAL responseText: " + JSON.stringify(response));
					Ti.App.Properties.setObject('access-response', response);
					callback && callback(null, response);
				}
			},
			onerror: function (e) {
				/**
				* Oops! Something went wrong here
				*/
				callback && callback(JSON.stringify(e));
			},
			timeout: 10000
		});
		xhr.open('POST', tokenUrl, true, null, null);
		xhr.send(bodyParms);
	}
}

/**
 * Closes the WebView for authenticating against Azure AD.
 * @private
 */
function _close() {
	_adalWebView && _adalWebView.close();
}
exports.close = _close;

/**
 * Helper Function
 */
function isArray(obj) {
	return Object.prototype.toString.call(obj) === '[object Array]';
}

/**
 * Client ID Property
 */
Object.defineProperty($, 'clientId', {
	get: function _getClientId() {
		return _clientId;
	},
	set: function _setClientId(id) {
		_clientId = id;
	}
});
/**
 * Client Secret Property
 */
Object.defineProperty($, 'clientSecret', {
	get: function _getClientKey() {
		return _clientSecret;
	},
	set: function _setClientKey(key) {
		_clientSecret = key;
	}
});
/**
 * State Property
 */
Object.defineProperty($, 'state', {
	get: function _getState() {
		return _state;
	},
	set: function _setState(key) {
		_state = key;
	}
});
/**
 * Tenant Property
 */
Object.defineProperty($, 'tenant', {
	get: function _getTenant() {
		return _tenant;
	},
	set: function _setTenant(t) {
		_tenant = t;
	}
});
/**
 * Azure Resource Property
 */
Object.defineProperty($, 'resourceId', {
	get: function _getResourceId() {
		return _resourceId;
	},
	set: function _setResourceId(id) {
		_resourceId = id;
	}
});
/**
 * Azure Redirect Url Property
 */
Object.defineProperty($, 'redirectUrl', {
	get: function _getRedirectUrl() {
		return _redirectUrl;
	},
	set: function _setRedirectUrl(url) {
		_redirectUrl = url;
	}
});
/**
 * Azure Scope Property
 */
Object.defineProperty($, 'scope', {
	get: function _getScope() {
		return _scope;
	},
	set: function _setScope(id) {
		_scope = id;
	}
});
/**
 * Window TitleBar Text Property
 */
Object.defineProperty($, 'customTitleText', {
	get: function _getCustomTitleText() {
		return _customTitleText;
	},
	set: function _setCustomTitleText(title) {
		_customTitleText = title;
	}
});

/**
 * Use Custom Server Property:  {BOOL}
 */
Object.defineProperty($, 'customServer', {
	get: function _getCustomServer() {
		return _customServer;
	},
	set: function _setCustomServer(useCustomServer) {
		_customServer = useCustomServer;
	}
});
/**
 * Custom Server Auth URL Property:	{STRING}
 */
Object.defineProperty($, 'customAuthUrl', {
	get: function _getCustomAuthUrl() {
		return _customAuthUrl;
	},
	set: function _setCustomAuthUrl(authUrl) {
		_customAuthUrl = authUrl;
	}
});
/**
 * Custom Server Token URL Property:	{STRING}
 */
Object.defineProperty($, 'customTokenUrl', {
	get: function _getCustomTokenUrl() {
		return _customTokenUrl;
	},
	set: function _setCustomTokenUrl(tokenUrl) {
		_customTokenUrl = tokenUrl;
	}
});
/**
 * Custom Server Cookie URL Property:	{STRING}
 */
Object.defineProperty($, 'customCookieUrl', {
	get: function _getCustomCookieUrl() {
		return _customCookieUrl;
	},
	set: function _setCustomCookieUrl(cookieUrl) {
		_customCookieUrl = cookieUrl;
	}
});
/**
 * Custom Server Cookie URL Property:	{STRING}
 */
Object.defineProperty($, 'customLogoutUrl', {
	get: function _getCustomLogoutUrl() {
		return _customLogoutUrl;
	},
	set: function _setCustomLogoutUrl(logoutUrl) {
		_customLogoutUrl = logoutUrl;
	}
});
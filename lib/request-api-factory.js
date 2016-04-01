'use strict';

const request = require("request-promise");
const extend = require("node.extend");

const RequestAPIFactory = function(apiSchema) {
	"use strict";

	makeApi(this, apiSchema);

	function apiCall(schema, data) {

		let config = extend({}, schema);

		if (schema.extendConfig) {
			schema.extendConfig(config, data);
		}

		config.data = (schema.data && schema.data.defaults) ? extend({}, schema.data.defaults, data) : data;

		if (schema.data && schema.data.required && (schema.data.validate || typeof schema.data.validate == 'undefined')) {

			let requiredOk = schema.data.required.every(item => {
				return Object.keys(config.data).indexOf(item) >= 0;
			});

			if (!requiredOk) {
				return Promise.reject('Missing some of the following required parameters: ' + schema.data.required.join(', ') + ' :: Current parameters :: ' + Object.keys(config.data).join(', '));
			}
		}

		if (!schema.method || schema.method.toLowerCase() == 'get') {
			config.qs = config.data;
		}

		if (schema.headers){
			let contentTypeKey = Object.keys(schema.headers).find(item => {
				return item.toLowerCase() == 'content-type';
			});

			let contentType = schema.headers[contentTypeKey];
			if(contentType.indexOf('application/x-www-form-urlencoded') >= 0){
				config.form = config.data;
			}

			if(contentType.indexOf('multipart/form-data') >= 0){
				config.formData = config.data;
			}

			if(contentType.indexOf('application/json') >= 0){
				config.body = config.data;
				config.json = true;
			}

		} else {
			config.body = config.data;
			config.json = true;
		}

		return request(config);
	}

	function createMethod(api) {
		return function(data) {
			return apiCall.call(this, api, data);
		};
	}

	function makeApi(api, schema) {
		for (let key in schema) {
			if (schema[key].apiSchema) {
				api[key] = createMethod(schema[key].apiSchema);
				api[key].schema = schema[key].apiSchema;
			} else {
				api[key] = {};
				makeApi(api[key], schema[key]);
			}
		}
	}
};

module.exports = RequestAPIFactory;
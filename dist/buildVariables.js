"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_admin_1 = require("react-admin");
var isObject_1 = __importDefault(require("lodash/isObject"));
var getFinalType_1 = __importDefault(require("./utils/getFinalType"));
var computeAddRemoveUpdate_1 = require("./utils/computeAddRemoveUpdate");
var mutations_1 = require("./constants/mutations");
//TODO: Object filter weren't tested yet
var buildGetListVariables = function (introspectionResults) { return function (resource, aorFetchType, params) {
    var filter = Object.keys(params.filter).reduce(function (acc, key) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (key === 'ids') {
            return __assign({}, acc, { id_in: params.filter[key] });
        }
        if (Array.isArray(params.filter[key])) {
            var type = introspectionResults.types.find(function (t) { return t.name === resource.type.name + "WhereInput"; });
            var inputField = type.inputFields.find(function (t) { return t.name === key; });
            if (!!inputField) {
                return __assign({}, acc, (_a = {}, _a[key] = { id_in: params.filter[key] }, _a));
            }
        }
        if (isObject_1.default(params.filter[key])) {
            var type = introspectionResults.types.find(function (t) { return t.name === resource.type.name + "WhereInput"; });
            var filterSome = type.inputFields.find(function (t) { return t.name === key + "_some"; });
            if (filterSome) {
                var filter_1 = Object.keys(params.filter[key]).reduce(function (acc, k) {
                    var _a;
                    return (__assign({}, acc, (_a = {}, _a[k + "_in"] = params.filter[key][k], _a)));
                }, {});
                return __assign({}, acc, (_b = {}, _b[key + "_some"] = filter_1, _b));
            }
        }
        var parts = key.split('.');
        if (parts.length > 1) {
            if (parts[1] == 'id') {
                var type = introspectionResults.types.find(function (t) { return t.name === resource.type.name + "WhereInput"; });
                var filterSome = type.inputFields.find(function (t) { return t.name === parts[0] + "_some"; });
                if (filterSome) {
                    return __assign({}, acc, (_c = {}, _c[parts[0] + "_some"] = { id: params.filter[key] }, _c));
                }
                return __assign({}, acc, (_d = {}, _d[parts[0]] = { id: params.filter[key] }, _d));
            }
            var resourceField = resource.type.fields.find(function (f) { return f.name === parts[0]; });
            if (resourceField.type.name === 'Int') {
                return __assign({}, acc, (_e = {}, _e[key] = parseInt(params.filter[key]), _e));
            }
            if (resourceField.type.name === 'Float') {
                return __assign({}, acc, (_f = {}, _f[key] = parseFloat(params.filter[key]), _f));
            }
        }
        return __assign({}, acc, (_g = {}, _g[key] = params.filter[key], _g));
    }, {});
    return {
        skip: (params.pagination.page - 1) * params.pagination.perPage,
        first: params.pagination.perPage,
        orderBy: params.sort.field + "_" + params.sort.order,
        where: filter
    };
}; };
var findInputFieldForType = function (introspectionResults, typeName, field) {
    var type = introspectionResults.types.find(function (t) { return t.name === typeName; });
    if (!type) {
        return null;
    }
    var inputFieldType = type.inputFields.find(function (t) { return t.name === field; });
    return !!inputFieldType ? getFinalType_1.default(inputFieldType.type) : null;
};
var inputFieldExistsForType = function (introspectionResults, typeName, field) {
    return !!findInputFieldForType(introspectionResults, typeName, field);
};
var findMutationInputType = function (introspectionResults, typeName, field, mutationType) {
    var inputType = findInputFieldForType(introspectionResults, typeName, field);
    return findInputFieldForType(introspectionResults, inputType.name, mutationType);
};
var hasMutationInputType = function (introspectionResults, typeName, field, mutationType) {
    return Boolean(findMutationInputType(introspectionResults, typeName, field, mutationType));
};
var buildReferenceField = function (_a) {
    var inputArg = _a.inputArg, introspectionResults = _a.introspectionResults, typeName = _a.typeName, field = _a.field, mutationType = _a.mutationType;
    var mutationInputType = findMutationInputType(introspectionResults, typeName, field, mutationType);
    return Object.keys(inputArg).reduce(function (acc, key) {
        var _a;
        return inputFieldExistsForType(introspectionResults, mutationInputType.name, key)
            ? __assign({}, acc, (_a = {}, _a[key] = inputArg[key], _a)) : acc;
    }, {});
};
var buildObjectMutationData = function (_a) {
    var inputArg = _a.inputArg, introspectionResults = _a.introspectionResults, typeName = _a.typeName, key = _a.key;
    var _b, _c;
    var hasConnect = hasMutationInputType(introspectionResults, typeName, key, mutations_1.PRISMA_CONNECT);
    var mutationType = hasConnect ? mutations_1.PRISMA_CONNECT : mutations_1.PRISMA_CREATE;
    var fields = buildReferenceField({
        inputArg: inputArg,
        introspectionResults: introspectionResults,
        typeName: typeName,
        field: key,
        mutationType: mutationType
    });
    // If no fields in the object are valid, continue
    if (Object.keys(fields).length === 0) {
        return {};
    }
    // Else, connect the nodes
    return _b = {},
        _b[key] = (_c = {}, _c[mutationType] = __assign({}, fields), _c),
        _b;
};
var buildUpdateVariables = function (introspectionResults) { return function (resource, aorFetchType, params) {
    return Object.keys(params.data).reduce(function (acc, key) {
        var _a, _b, _c;
        // Put id field in a where object
        if (key === 'id' && params.data[key]) {
            return __assign({}, acc, { where: {
                    id: params.data[key]
                } });
        }
        var inputType = findInputFieldForType(introspectionResults, resource.type.name + "UpdateInput", key);
        if (!inputType) {
            return acc;
        }
        if (Array.isArray(params.data[key])) {
            //TODO: Make connect, disconnect and update overridable
            //TODO: Make updates working
            var _d = computeAddRemoveUpdate_1.computeFieldsToAddRemoveUpdate(params.previousData[key + "Ids"], params.data[key + "Ids"]), fieldsToAdd = _d.fieldsToAdd, fieldsToRemove = _d.fieldsToRemove /* fieldsToUpdate */;
            return __assign({}, acc, { data: __assign({}, acc.data, (_a = {}, _a[key] = (_b = {},
                    _b[mutations_1.PRISMA_CONNECT] = fieldsToAdd,
                    _b[mutations_1.PRISMA_DISCONNECT] = fieldsToRemove,
                    _b), _a)) });
        }
        if (isObject_1.default(params.data[key])) {
            if (inputType.kind !== 'SCALAR') {
                var typeName = resource.type.name + "UpdateInput";
                var data = buildObjectMutationData({
                    inputArg: params.data[key],
                    introspectionResults: introspectionResults,
                    typeName: typeName,
                    key: key
                });
                return __assign({}, acc, { data: __assign({}, acc.data, data) });
            }
        }
        var type = introspectionResults.types.find(function (t) { return t.name === resource.type.name; });
        var isInField = type.fields.find(function (t) { return t.name === key; });
        if (!!isInField) {
            // Rest should be put in data object
            return __assign({}, acc, { data: __assign({}, acc.data, (_c = {}, _c[key] = params.data[key], _c)) });
        }
        return acc;
    }, {});
}; };
var buildCreateVariables = function (introspectionResults) { return function (resource, aorFetchType, params) {
    return Object.keys(params.data).reduce(function (acc, key) {
        var _a, _b, _c;
        // Put id field in a where object
        if (key === 'id' && params.data[key]) {
            return __assign({}, acc, { where: {
                    id: params.data[key]
                } });
        }
        var inputType = findInputFieldForType(introspectionResults, resource.type.name + "UpdateInput", key);
        if (!inputType) {
            return acc;
        }
        if (Array.isArray(params.data[key])) {
            return __assign({}, acc, { data: __assign({}, acc.data, (_a = {}, _a[key] = (_b = {},
                    _b[mutations_1.PRISMA_CONNECT] = params.data[key + "Ids"].map(function (id) { return ({
                        id: id
                    }); }),
                    _b), _a)) });
        }
        if (isObject_1.default(params.data[key])) {
            var inputType_1 = findInputFieldForType(introspectionResults, resource.type.name + "UpdateInput", key);
            if (!inputType_1) {
                return acc;
            }
            if (inputType_1.kind !== 'SCALAR') {
                var typeName = resource.type.name + "CreateInput";
                var data = buildObjectMutationData({
                    inputArg: params.data[key],
                    introspectionResults: introspectionResults,
                    typeName: typeName,
                    key: key
                });
                return __assign({}, acc, { data: __assign({}, acc.data, data) });
            }
        }
        var type = introspectionResults.types.find(function (t) { return t.name === resource.type.name; });
        var isInField = type.fields.find(function (t) { return t.name === key; });
        if (isInField) {
            // Rest should be put in data object
            return __assign({}, acc, { data: __assign({}, acc.data, (_c = {}, _c[key] = params.data[key], _c)) });
        }
        return acc;
    }, {});
}; };
exports.default = (function (introspectionResults) { return function (resource, aorFetchType, params) {
    var _a;
    switch (aorFetchType) {
        case react_admin_1.GET_LIST: {
            return buildGetListVariables(introspectionResults)(resource, aorFetchType, params);
        }
        case react_admin_1.GET_MANY:
            return {
                where: { id_in: params.ids }
            };
        case react_admin_1.GET_MANY_REFERENCE: {
            var parts = params.target.split('.');
            return {
                where: (_a = {}, _a[parts[0]] = { id: params.id }, _a)
            };
        }
        case react_admin_1.GET_ONE:
            return {
                where: { id: params.id }
            };
        case react_admin_1.UPDATE: {
            return buildUpdateVariables(introspectionResults)(resource, aorFetchType, params);
        }
        case react_admin_1.CREATE: {
            return buildCreateVariables(introspectionResults)(resource, aorFetchType, params);
        }
        case react_admin_1.DELETE:
            return {
                where: { id: params.id }
            };
    }
}; });
//# sourceMappingURL=buildVariables.js.map
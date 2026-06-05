/**
 * Copyright © 2018, Oracle and/or its affiliates. All rights reserved.
 * @NApiVersion 2.0
 * @NModuleScope Public
 */
define([], function() {

    function toNumber(value) {
        if (isString(value) && value.match(/^[0-9.]*%$/)) {
            return Number(value.replace(/%/, '')) / 100;
        } else {
            return Number(value);
        }
    }

    function toAbsNumber(value) {
        return Math.abs(toNumber(value));
    }

    function toNormalizedNumber(value) {
        if (!ensure(value)) {
            return 0;
        }
        var num = toNumber(value);
        if (!ensure(num)) {
            return 0;
        }
        return num;
    }

    function toUnnormalizedNumber(value) {
        if (isString(value) && !value.trim()) {
            return value;
        }
        if (isBoolean(value)) {
            return value;
        }
        if (!ensure(value)) {
            return value;
        }
        var num = toNumber(value);
        if (!ensure(num)) {
            return value;
        }
        return num;
    }

    function numberForString(value){
        if(isString(value)){
            return value.replace(/[^0-9]/ig,"");
        }
        return '';
    }


    function isString(bechecked) {
        return typeof bechecked === 'string' && bechecked.constructor === String || Object.prototype.toString.apply(bechecked) === '[object String]' || bechecked instanceof String;
    }

    function isArray(bechecked) {
        return bechecked && typeof bechecked === 'object' && bechecked.constructor === Array || Object.prototype.toString.apply(bechecked) === '[object Array]' || bechecked instanceof Array;
    }

    function isBoolean(bechecked) {
        return typeof bechecked === 'boolean' && bechecked.constructor === Boolean || Object.prototype.toString.apply(bechecked) === '[object Boolean]' || bechecked instanceof Boolean;
    }

    function isNumber(bechecked) {
        if (isNaN(bechecked)) {
            return false;
        }
        return (typeof bechecked === 'number' && bechecked.constructor === Number || Object.prototype.toString.apply(bechecked) === '[object Number]' || bechecked instanceof Number) && isFinite(bechecked);
    }

    function isNaN(bechecked) {
        return String(bechecked) === 'NaN'; // Don't use JavaScript isNaN as isNaN('a') returns true. Number.isNaN is introduced in ES6.
    }

    function isDate(bechecked) {
        return (typeof bechecked === 'date' && bechecked.constructor === Date || Object.prototype.toString.apply(bechecked) === '[object Date]' || bechecked instanceof Date) && !isNaN(bechecked.valueOf());
    }

    function isFunction(bechecked) {
        return typeof bechecked === 'function' && bechecked.constructor === Function || Object.prototype.toString.apply(bechecked) === '[object Function]' || bechecked instanceof Function;
    }

    function isObject(bechecked) {
        return bechecked && (typeof bechecked === 'object' && bechecked.constructor === Object || Object.prototype.toString.apply(bechecked) === '[object Object]');
    }

    function isPrimitive(bechecked) {
        return isString(bechecked) || isBoolean(bechecked) || isNumber(bechecked);
    }

    /**
     * Check an object to be valid or not.
     * @param {object} bechecked target object to be tested
     * @returns true if the target object is valid, false otherwise.
     *
     * @see {@function makesure}
     */
    function ensure(bechecked) {
        if (!bechecked) {
            return false;
        }
        if (isArray(bechecked)) {
            return bechecked.length > 0;
        }
        return true;
    }

    /**
     * This function behave differently on checking 0, false, blank string with only spaces than the @function ensure.
     *
     * E.g.  makesure({}) -> true
     *       makesure([]) -> false
     *       makesure('') -> false
     *       makesure(' ') -> false
     *       makesure(null) -> false
     *       makesure(undefined) -> false
     *       makesure(NaN) -> false
     *
     * @param {object} bechecked target object to be tested
     * @returns true if the target object is valid, false otherwise.
     *
     * @see {@function ensure}
     */
    function makesure(bechecked) {
        if (isNumber(bechecked)) {
            if (isNaN(bechecked)) {
                return false;
            }
            return true;
        }
        if (isBoolean(bechecked)) {
            return true;
        }
        if (isString(bechecked) && !bechecked.trim()) {
            return false;
        }
        if (!bechecked) {
            return false;
        }
        if (isArray(bechecked)) {
            return bechecked.length > 0;
        }
        return true;
    }

    /**
     * This function behave differently on checking empty object like {} than the @function makesure.
     *
     * E.g. force({}) -> false
     *      force([]) -> false
     *      force('') -> false
     *      force(' ') -> false
     *      force(null) -> false
     *      force(undefined) -> false
     *      force(NaN) -> false
     *
     * @param {object} bechecked target object to be tested
     * @returns true if the target object is valid, false otherwise.
     *
     * @see {@function makesure}
     */
    function makecertain(bechecked) {
        if (!makesure(bechecked)) {
            return false;
        }
        if (isEmptyObject(bechecked)) {
            return false;
        }
        return true;
    }

    function convince(bechecked) {
        if (!makecertain(bechecked)) {
            return false;
        }
        if (isArray(bechecked)) {
            for (var i = 0; i < bechecked.length; i++) {
                if (makecertain(bechecked[i])) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    function makesureall(bechecked /*, level1, level2, ... levelN*/) {
        if (arguments.length === 1) {
            if (!makesure(bechecked)) {
                return false;
            }
        }

        for (var i = 1; i < arguments.length; i++) {
            if (!bechecked || !bechecked.hasOwnProperty(arguments[i])) {
                return false;
            }
            bechecked = bechecked[arguments[i]];
        }

        if (!makesure(bechecked)) {
            return false;
        }

        return true;
    }

    function isEmptyObject(bechecked) {
        if (!makesure(bechecked)) {
            return false;
        }
        if (!isObject(bechecked)) {
            return false;
        }
        // Object.keys returns an array of a given object's own enumerable properties. If you want all properties, even not enumerables, use Object.getOwnPropertyNames.
        if (Object.keys(bechecked).length > 0) {
            return false;
        }
        return true;
    }

    /**
     * Copy values from NetSuite record.Record object or NetSuite search.Result object to JavaScript object identified by property names. This method doesn't support the join for the search return column.
     *
     * @param {object} from Any NetSuite record.Record or search.Result object.
     * @param {object} to Any JavaScript object including array.
     * @param {array} names An array contains objects like {name: 'name', type: 'text'}, type can be 'text' and 'value'.
     * @returns
     */
    function copy(from, to, names) {
        if (!makesure(from) || !makesure(to) || !makesure(names)) {
            return;
        }
        for (var i in names) {
            if (names[i].type === 'text') {
                to[names[i].name] = from.getText(names[i].name);
            } else {
                to[names[i].name] = from.getValue(names[i].name);
            }
        }
    }

    /**
     * Check if target object(JavScript object, NetSuite record.Record and NetSuite search.Result) has valid specified field.
     *
     * @param target The target object to be tested.
     * @param field The specified field for which to check validity.
     * @returns true if the target object has a valid specified field, false otherwise.
     */
    function hasField(target, field) {
        if (!makesure(target)) {
            return false;
        }
        if (makesure(target[field])) {
            // JavaScript object
            return true;
        }
        if (isFunction(target.getValue) && makesure(target.getValue({
            fieldId: field, // NetSuite record.Record
            name: field
            // NetSuite search.Result
        }))) {
            return true;
        }
        return false;
    }

    function startsWith(bechecked, prefix) {
        if (!isString(bechecked) || !isString(prefix)) {
            return false;
        }
        return bechecked.indexOf(prefix) === 0;
    }

    function endsWith(bechecked, suffix) {
        if (!isString(bechecked) || !isString(suffix)) {
            return false;
        }
        return bechecked.slice(-suffix.length) === suffix;
    }

    function includes(bechecked, target) {
        if (!isString(bechecked) || !isString(target)) {
            return false;
        }
        return bechecked.indexOf(target) >= 0;
    }

    function replace(bereplaced, occurrence, replacement) {
        if (!isString(bereplaced) || !isString(occurrence) || !isString(replacement)) {
            return bereplaced;
        }
        return bereplaced.split(occurrence).join(replacement);
    }

    function trim(betrimed) {
        if(isString(betrimed)) {
            return betrimed.trim();
        }
        return betrimed;
    }

    function sign(bechecked) {
        if (bechecked === null || !isNumber(toNumber(bechecked))) {
            throw new TypeError(bechecked + ' is not a normalized number');
        }
        if (toNumber(bechecked) === 0) {
            return toNumber(bechecked);
        }
        return toNumber(bechecked) / toAbsNumber(bechecked);
    }

    /**
     * Justify the being checked array if contains the target value.
     *
     * @param {Array} becheckedArray The being checked array
     * @param {Object | Primitive} targetValue The target value
     * @return true if checked array contains the target value, false otherwise
     */
    function contains(becheckedArray, targetValue) {
        if (!makesure(becheckedArray)) {
            return false;
        }
        var index = becheckedArray.length;
        while (index--) {
            if (isObject(targetValue)) {
                if (JSON.stringify(becheckedArray[index]) === JSON.stringify(targetValue)) {
                    return true;
                }
            } else {
                if (becheckedArray[index] === targetValue) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * @desc This function will keep your script busy for some seconds. This is a simulation of so-called sleep function.
     * @param {Number} seconds - The time in seconds to sleep
     */
    function sleep(seconds) {
        if (!isNumber(seconds)) {
            return;
        }
        try {
            var endTime = new Date().getTime() + seconds * 1000;
            do {
                var now = new Date().getTime();
            } while (now < endTime);
        } catch (e) {
            // do nothing
        }
    }


    function byteLength(bechecked) {
        var found = bechecked.match(/[^\x00-\xff]/g);
        return bechecked.length + (!found ? 0 : found.length);
    }

    // The most common CJK ideographs used in modern Chinese
    function isCJKUnifiedIdeographs(bechecked) {
        return /^[\u4E00-\u9FFF]+$/.test(bechecked);
    }

    /**
     *  Clone the given object and generate a new one. Deep clone has its limit of only working on JSON-serializable content.
     * @param {*} beCloned - The object to be cloned
     * @param {Boolean} deep - Identify if deep clone
     * @returns {*} - The new object
     */
    function clone(beCloned, deep) {
        if (beCloned !== Object(beCloned)) {
            return beCloned;
        }
        if (isArray(beCloned)) {
            if (!deep) {
                return beCloned.slice();
            } else {
                return JSON.parse(JSON.stringify(beCloned));
            }
        }
        if (isObject(beCloned)) {
            if (!deep) {
                throw "Not implemented"; // Object.assign({}, beCloned); // ES6
            } else {
                return JSON.parse(JSON.stringify(beCloned));
            }
        }
        if (isDate(beCloned)) {
            return new Date(beCloned.getTime());
        }
        throw "Not support";
    }

    /**
     *  Deep clone the given object and generate a new one. Cyclic/duplicate references is not supported.
     * @param {*} obj - The object to be cloned
     * @return {*} - The new object
     */
    function cloneObjectDeep(obj) {
        if(!obj || typeof(obj)!="object")
            return obj;
        var clone = {};
        for(var i in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, i)){
                if(!obj[i]) {
                    clone[i] = obj[i];
                }
                else if(typeof(obj[i])=="object") {
                    if (obj[i].constructor == Date || obj[i].constructor == RegExp || obj[i].constructor == Function ||
                        obj[i].constructor == String || obj[i].constructor == Number || obj[i].constructor == Boolean)
                        clone[i] = new obj[i].constructor(obj[i]);
                    else
                        clone[i] = cloneObjectDeep(obj[i]);
                }
                else
                    clone[i] = obj[i];
            }
        }
        return clone;
    }

    function remove(array, element) {
        if (!makesure(array)) {
            return;
        }
        var index = array.indexOf(element);
        if (index !== -1) {
            return array.splice(index, 1);
        }
    }
    
    /**
     * Dedup(remove duplicate) data of array
     * 
     * @param {Array} with duplicate values
     * @param {Funtion} mapper map entry to a string for identifying equality of entries 
     *        if no mapper, use original entry 
     * @return array with unique values 
     */
    function dedup(array, mapper) {
        if(!isArray(array)) {
            return array;
        }
        var mapper = makesure(mapper) ? mapper : function (value) {
            return value;
        };
        var mappedArray = array.map(mapper);
        return array.filter(function (entry, i) {
            return mappedArray.indexOf(mapper(entry)) === i;
        });
    }

    /**
     * @desc Remove duplicates from an array.
     * @param {Array} {required} array - array containing duplicate elements
     * @param {Function} {required} checkIfDuplicate - function to check duplicate
     * @return {Array} - Array removed duplicates.
     */
    function dedup2(array, checkIfDuplicate) {
        if(!isArray(array)) {
            return array;
        }
        return array.reduce(function(reducedArray, element){
            for (var i = 0; i < reducedArray.length; i++) {
                if (checkIfDuplicate(reducedArray[i], element)) {
                    return reducedArray;
                }
            }
            reducedArray.push(element);
            return reducedArray;
        }, []);
    }

    function normalize(value) {
        if (isNumber(value)) {
            return toNormalizedNumber(value);
        }
        if (isArray(value)) {
            return value.filter(function(e) {
                return makesure(e);
            });
        }
        if (isObject(value)) {
            return Object.keys(value).reduce(function(reducedObj, e) {
                if (makesure(e)) {
                    reducedObj[e] = value[e];
                }
                return reducedObj;
            }, {});
        }
        return value;
    }

    function linearize(belinearized) {
        if (isString(belinearized)) {
            return belinearized.replace(/\r/g, '').replace(/\n/g, '');
        }
        return belinearized;
    }

    function parse(beparsed) {
        if(isString(beparsed)) {
            return JSON.parse(beparsed);
        }
        return beparsed;
    }

    function stringify(bestringified) {
        if(isString(bestringified)) {
            return bestringified;
        } else {
            return JSON.stringify(bestringified);
        }
    }

    function random() {
        var gen = Math;
        return new Date().getTime() + '.' + gen['random']();
    }

    return {
        toNumber: toNumber,
        toAbsNumber: toAbsNumber,
        toNormalizedNumber: toNormalizedNumber,
        toUnnormalizedNumber: toUnnormalizedNumber,
        numberForString: numberForString,
        isString: isString,
        isArray: isArray,
        isBoolean: isBoolean,
        isNumber: isNumber,
        isNaN: isNaN,
        isDate: isDate,
        isFunction: isFunction,
        isObject: isObject,
        isPrimitive: isPrimitive,
        isEmptyObject: isEmptyObject,
        ensure: ensure,
        makesure: makesure,
        makecertain: makecertain,
        convince: convince,
        makesureall: makesureall,
        copy: copy,
        hasField: hasField,
        startsWith: startsWith,
        endsWith: endsWith,
        includes: includes,
        replace: replace,
        trim: trim,
        sign: sign,
        contains: contains,
        sleep: sleep,
        byteLength: byteLength,
        isCJKUnifiedIdeographs: isCJKUnifiedIdeographs,
        clone: clone,
        cloneObjectDeep: cloneObjectDeep,
        remove: remove,
        dedup: dedup,
        dedup2: dedup2,
        normalize: normalize,
        linearize: linearize,
        parse: parse,
        stringify: stringify,
        random: random
    };

});

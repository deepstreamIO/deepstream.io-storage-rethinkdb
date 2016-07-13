"use strict"

/**
 * Inverts the data from the deepstream structure to reduce nesting.
 *
 * { _v: 1, _d: { name: 'elasticsearch' } } -> { name: 'elasticsearch', __ds = { _v: 1 } }
 *
 * @param  {String} value The data to save
 *
 * @private
 * @returns {Object} data
 */
module.exports.transformValueForStorage = function ( value ) {
  value = JSON.parse( JSON.stringify( value ) )
  var data = value._d
  delete value._d
  data.__ds = value
  return data
}

/**
 * Inverts the data from the stored structure back to the deepstream structure
 *
 * { name: 'elasticsearch', __ds = { _v: 1 } } -> { _v: 1, _d: { name: 'elasticsearch' } }
 *
 * @param  {String} value The data to transform
 *
 * @private
 * @returns {Object} data
 */
module.exports.transformValueFromStorage = function( value ) {
  var data = value.__ds
  delete value.__ds
  data._d = value
  return data
}
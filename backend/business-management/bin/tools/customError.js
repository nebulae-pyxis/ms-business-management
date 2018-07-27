//Every single error code
// please use the prefix assigned to this micorservice
const INTERNAL_SERVER_ERROR_CODE = 15001;
const BUSINESS_MISSING_DATA_ERROR_CODE = 15010;
const BUSINESS_NAME_EXISTS_ERROR_CODE = 15011;
const BUSINESS_PERMISSION_DENIED_ERROR_CODE = 15012;

/**
 * class to emcapsulute diferent errors.
 */
class CustomError extends Error {
    constructor(name, method, code = INTERNAL_SERVER_ERROR_CODE , message = '') {
      super(message); 
      this.code = code;
      this.name = name;
      this.method = method;
    }
  
    getContent(){
      return {
        name: this.name,
        code: this.code,
        msg: this.message,      
        method: this.method,
        // stack: this.stack
      }
    }
  };

  class DefaultError extends Error{
    constructor(anyError){
      super(anyError.message)
      this.code = INTERNAL_SERVER_ERROR_CODE;
      this.name = anyError.name;
      this.msg = anyError.message;
      // this.stack = anyError.stack;
    }

    getContent(){
      return{
        code: this.code,
        name: this.name,
        msg: this.msg
      }
    }
  }

  module.exports =  { 
    CustomError,
    DefaultError,
    BUSINESS_MISSING_DATA_ERROR_CODE,
    BUSINESS_NAME_EXISTS_ERROR_CODE,
    BUSINESS_PERMISSION_DENIED_ERROR_CODE,
    INTERNAL_SERVER_ERROR_CODE
  } 
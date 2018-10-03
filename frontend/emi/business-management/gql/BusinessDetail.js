import gql from 'graphql-tag';

// We use the gql tag to parse our query string into a query document
// QUERIES
export const getBusiness = gql`
  query getBusiness($id: String!) {
    getBusiness(id: $id) {
      _id
      generalInfo {
        documentType
        documentId
        name
        type      
        email
        contactInfo
      }
      attributes{
        key
        value
      }
      state
    }
  }
`;

// MUTATIONS
export const persistBusiness = gql`
  mutation persistBusiness($input: BusinessPersistInput) {
    persistBusiness(input: $input) {
      code
      message
    }
  }
`;

export const updateBusinessGeneralInfo = gql`
  mutation updateBusinessGeneralInfo($id: ID, $input: BusinessGeneralInfoInput) {
    updateBusinessGeneralInfo(id: $id, input: $input) {
      code
      message
    }
  }
`;

export const updateBusinessAttributes = gql`
  mutation updateBusinessAttributes($id: ID,$input: BusinessAttributeListInput) {
    updateBusinessAttributes(id: $id, input: $input) {
      code
      message
    }
  }
`;


export const updateBusinessState = gql`
  mutation updateBusinessState($id: ID, $state: Boolean) {
    updateBusinessState(id: $id, state: $state) {
      code
      message
    }
  }
`;


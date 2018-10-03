import gql from "graphql-tag";

// We use the gql tag to parse our query string into a query document

// QUERIES
export const getBusinesses = gql`
  query getBusinesses($page: Int!, $count: Int!, $filterText: String, $sortColumn: String, $sortOrder: String){
  getBusinesses(page: $page, count: $count, filter: $filterText, sortColumn: $sortColumn, sortOrder: $sortOrder){
    _id
    generalInfo {
      documentType
      documentId
      name
      type      
      email
      contactInfo
    }
    state
  }
}
`;

export const getBusinessCount = gql`
  query {
    getBusinessCount
  }
`;

// SUBSCRIPTION
export const subscribeBusinessUpdatedSubscription = gql`
  subscription{
    BusinessUpdatedSubscription{
      _id
      generalInfo{
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
}`;


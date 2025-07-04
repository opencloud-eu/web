Feature: keycloak integration
  As a user
  I want to use Keycloak users and groups in OpenCloud
  So that I can verify that Keycloak-created entities are accessible and functional in OpenCloud


  Scenario: keycloak integration
    Given admin creates following users using keycloak API
      | id    |
      | Alice |
      | Brian |
      | Carol |
    And admin assigns following roles to the users using keycloak API
      | id    | role        |
      | Alice | Space Admin |
    # Group role assignment - all members of the group inherit the assigned role
    And admin creates following groups using keycloak API
      | id       | role        |
      | sales    |             |
      | finance  | Space Admin |
      | security | User        |
    And admin adds user to the group using keycloak API
      | user  | group    |
      | Alice | sales    |
      | Brian | finance  |
      | Carol | security |
      | Carol | finance  |

    When "Alice" logs in
    Then "Alice" should have self info:
      | key         | value             |
      | username    | alice             |
      # | displayname | Alice Murphy      |
      | email       | alice@example.org |
      | groups      | sales             |
    And "Alice" opens the "files" app
    And "Alice" navigates to the projects space page
    And "Alice" creates the following project spaces
      | name      | id          |
      | teamSpace | teamSpace.1 |
    And "Alice" navigates to the project space "teamSpace.1"
    And "Alice" creates the following resources
      | resource        | type    |
      | security-folder | folder  |
      | finance-folder  | folder  |
      
    And "Alice" shares the following resource using the sidebar panel
      | resource        | recipient | type  | role     | resourceType |
      | finance-folder  | finance   | group | Can edit | folder       |
      | finance-folder  | Brian     | user  | Can edit | file         |
      | security-folder | security  | group | Can view | folder       |
      | security-folder | Carol     | user  | Can view | file         |
    And "Alice" logs out

    And "Brian" logs in
    And "Brian" navigates to the projects space page
    And "Brian" creates the following project spaces
      | name       | id           |
      | brianSpace | brianSpace.1 |
    And "Brian" adds following users to the project space
      | user     | role     | kind  |
      | Carol    | Can edit | user  |
      | security | Can view | group |
    And "Brian" logs out

    When "Carol" logs in
    Then "Alice" should have self info:
      | key         | value             |
      | username    | carol             |
      # | displayname | Alice Murphy      |
      | email       | carol@example.org |
      | groups      | sales             |
    And "Alice" opens the "files" app
    And "Carol" navigates to the projects space page
    Then "Carol" should see the following spaces
      | id           |
      | brianSpace.1 |
    And "Carol" logs out

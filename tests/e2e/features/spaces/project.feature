Feature: spaces.project

  Scenario: creating a project space
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
   
    When "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" navigates to the projects space page
    And "Alice" creates the project space "sales-team"
    And "Alice" navigates to the project space "sales-team"
    And "Alice" updates the space "sales-team" name to "sales team"
    And "Alice" changes the space "sales-team" subtitle to "sales team - subtitle"
    And "Alice" updates the space "sales-team" description to "sales team - description"
    And "Alice" changes the space "sales-team" quota to "50"
    And "Alice" updates the space "sales-team" image to "testavatar.png"
    And space image should match 16/9 ratio for user "Alice"
    And "Alice" deletes the space "sales-team" image
    And "Alice" changes the space "sales-team" icon to "😍"
    Then "Alice" should see the following details of the project space
      | subtitle              | description              | quota |
      | sales team - subtitle | sales team - description | 50GB  |

    And "Alice" logs out


  Scenario: members of the space can control the versions of the files
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
      | Carol |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" logs in
    And "Alice" creates the project space using API "team"
    And "Alice" navigates to the project space "team"
    And "Alice" creates the following resources
      | resource               | type     | content             |
      | parent                 | folder   |                     |
      | parent/textfile.ocnote | noteFile | some random content |
    When "Alice" uploads the following resource
      | resource        | to     | option  |
      | textfile.ocnote | parent | replace |
    And "Alice" adds following users to the project space
      | user  | role     | kind |
      | Carol | Can view | user |
      | Brian | Can edit | user |
    And "Alice" logs out

    When "Carol" logs in
    And "Carol" navigates to the project space "team"
    And "Carol" should not see the version panel for the file
      | resource        | to     |
      | textfile.ocnote | parent |
    And "Carol" logs out

    When "Brian" logs in
    And "Brian" navigates to the project space "team"
    And "Brian" downloads old version of the following resource
      | resource        | to     |
      | textfile.ocnote | parent |
    And "Brian" restores following resource version
      | resource        | to     | version | openDetailsPanel |
      | textfile.ocnote | parent | 1       | true             |
    And "Brian" logs out

  
  Scenario: creating project spaces with options
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" logs in
    And "Alice" navigates to the projects space page
    When "Alice" creates the project spaces with options
      | name | image          | subtitle      | description      | quota | member | role     |
      | team | testavatar.png | Team Subtitle | Team Description | 10GB  | Brian  | Can edit |
    And "Alice" logs out
    
    And "Brian" logs in
    And "Brian" opens the "files" app
    And "Brian" navigates to the projects space page
    And "Brian" should see space "team"
    And "Brian" navigates to the project space "team"
    And "Brian" creates the following resources
      | resource   | type   |
      | brian-test | folder |
    And "Brian" should see the following details of the project space
      | subtitle      | description      | quota |
      | Team Subtitle | Team Description | 10GB  |
    And "Brian" logs out

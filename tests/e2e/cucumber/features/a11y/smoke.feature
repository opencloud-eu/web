@a11y
Feature: Accessibility checks

  Scenario: check files view wrapper accessibility
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Admin" creates following groups using API
      | id    |
      | sales |
    And "Admin" assigns following roles to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Admin" adds user to the group using API
      | user  | group |
      | Alice | sales |
    And "Alice" creates the following project spaces using API
      | name     | id       |
      | my_space | my_space |
    And "Alice" creates the following folder in space "my_space" using API
      | name        |
      | spaceFolder |
    And "Alice" creates the following folders in personal space using API
      | name   |
      | parent |
    And "Alice" uploads the following local file into personal space using API
      | localFile       | to              |
      | testavatar.jpeg | testavatar.jpeg |
    And "Alice" shares the following resource using API
      | resource | recipient | type  | role     |
      | parent   | Brian     | user  | Can edit |
      | parent   | sales     | group | Can edit |
    And "Alice" creates a public link of following resource using API
      | resource | role     | password |
      | parent   | Can edit | %public% |
    
    ## checks login page
    When "Alice" logs in

    ## check files-view-wrapper
    # personal space
    And "Alice" opens the "files" app
    And "Alice" check accessibility of the ".files-view-wrapper" page
    And "Alice" switches to the tiles-view
    And "Alice" check accessibility of the ".files-view-wrapper" page
    And "Alice" switches to the "resource-table-condensed" view mode
    And "Alice" check accessibility of the ".files-view-wrapper" page

    # shares
    And "Alice" navigates to the shared with me page
    And "Alice" check accessibility of the ".files-view-wrapper" page
    And "Alice" navigates to the shared with others page
    And "Alice" check accessibility of the ".files-view-wrapper" page
    And "Alice" navigates to the shared via link page
    And "Alice" check accessibility of the ".files-view-wrapper" page

    # project spaces
    And "Alice" navigates to the projects space page
    And "Alice" check accessibility of the ".files-view-wrapper" page
    And "Alice" switches to the tiles-view
    And "Alice" check accessibility of the ".files-view-wrapper" page
    And "Alice" navigates to the project space "my_space"
    And "Alice" check accessibility of the ".files-view-wrapper" page
    And "Alice" switches to the "resource-table" view mode
    And "Alice" check accessibility of the ".files-view-wrapper" page

    # deleted files
    # search results

    ## check accesability on top bar
    # search panel
    # notifications
    
    ## left sidebar web-nav-sidebar
    
    ## admin-settings-view-wrapper
    # general
    # users
    # groups
    # spaces

    ## account page

    ## app-sidebar (right sidebar)

    ## public link page
    
    When "Alice" logs out

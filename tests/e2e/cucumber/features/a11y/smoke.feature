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
      | Brian | Admin       |
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
      | name          |
      | parent        |
      | deletedFolder |
    And "Alice" deletes the following resource from personal space using API
      | resource      |
      | deletedFolder |
    And "Alice" uploads the following local file into personal space using API
      | localFile       | to              |
      | testavatar.jpeg | testavatar.jpeg |
      | lorem.txt       | lorem.txt       |
    And "Alice" adds the following tags for the following resources using API
      | resource        | tags      |
      | testavatar.jpeg | alice tag |
    And "Alice" shares the following resource using API
      | resource | recipient | type  | role     |
      | parent   | Brian     | user  | Can edit |
      | parent   | sales     | group | Can edit |

    ## checks login page
    When "Alice" logs in
    And "Brian" logs in

    ## 1. check files-view-wrapper
    # personal space
    And "Alice" opens the "files" app
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "personal space"
    And "Alice" switches to the "table-condensed" view
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "personal space"
    # check empty page
    And "Brian" opens the "files" app
    And "Brian" checks the accessibility of the DOM selector ".files-view-wrapper" on the "personal space"

    # shares
    And "Alice" navigates to the shared with me page
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "shares"
    And "Alice" navigates to the shared with others page
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "shares"
    And "Alice" navigates to the shared via link page
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "shares"

    # project spaces
    And "Alice" navigates to the projects space page
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "project spaces"
    And "Alice" switches to the "tiles" view
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "project spaces"
    And "Alice" navigates to the project space "my_space"
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "project spaces"
    And "Alice" switches to the "table" view
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "project spaces"

    # deleted files
    And "Alice" navigates to the trashbin
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "deleted files"
    And "Alice" opens trashbin of the personal space
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "deleted files -> Personal"

    # search results
    And "Alice" searches "test" using the global search and the "all files" filter and presses enter
    And "Alice" checks the accessibility of the DOM selector ".files-view-wrapper" on the "Search result"


    ## 2. check accesability on top bar
    And "Brian" checks the accessibility of the DOM selector "#oc-topbar" on the "top bar"

    # search panel
    And "Brian" opens location search panel
    And "Brian" checks the accessibility of the DOM selector ".tippy-content" on the "search panel"

    # notifications
    And "Brian" opens notifications dropdown
    And "Brian" checks the accessibility of the DOM selector "#oc-notifications-drop" on the "notifications dropdown"

    # apps menu
    And "Brian" opens the apps menu
    And "Brian" checks the accessibility of the DOM selector "#app-switcher-dropdown" on the "apps menu"


    ## 3. left sidebar web-nav-sidebar
    And "Brian" checks the accessibility of the DOM selector "#web-nav-sidebar" on the "left sidebar"


    ## 4. account page
    And "Brian" opens the user menu
    And "Brian" opens "Profile" on the user menu
    And "Brian" checks the accessibility of the DOM selector "#account-information" on the "account menu->profile"
    And "Brian" opens "Preferences" on the user menu
    And "Brian" checks the accessibility of the DOM selector "#account-preferences" on the "account menu->preferences"
    And "Brian" opens "Extensions" on the user menu
    And "Brian" checks the accessibility of the DOM selector "#account-extensions" on the "account menu->extensions"
    And "Brian" opens "Calendar" on the user menu
    And "Brian" checks the accessibility of the DOM selector "#account-calendar" on the "account menu->calendar"
    And "Brian" opens "GDPR" on the user menu
    And "Brian" checks the accessibility of the DOM selector "#account-gdpr" on the "account menu->gdpr"


    ## 5. admin-settings-view-wrapper
    # general
    And "Brian" opens the "admin-settings" app
    And "Brian" checks the accessibility of the DOM selector "#admin-settings-view-wrapper" on the "admin settings->general"

    # users
    And "Brian" navigates to the users management page
    And "Brian" checks the accessibility of the DOM selector "#admin-settings-view-wrapper" on the "admin settings->users"
    And "Brian" selects the user "Alice"
    And "Brian" checks the accessibility of the DOM selector "#admin-settings-view-wrapper" on the "admin settings->users"
    And "Brian" opens the edit panel of user "Alice" using the context menu
    And "Brian" checks the accessibility of the DOM selector "#sidebar-panel-EditPanel" on the "admin settings->users->edit user sidebar panel"

    # groups
    And "Brian" navigates to the groups management page
    And "Brian" checks the accessibility of the DOM selector "#admin-settings-view-wrapper" on the "admin settings->groups"
    And "Brian" selects the group "sales"
    And "Brian" checks the accessibility of the DOM selector "#admin-settings-view-wrapper" on the "admin settings->groups"
    And "Brian" opens the edit panel of group "sales" using the context menu
    And "Brian" checks the accessibility of the DOM selector "#sidebar-panel-EditPanel" on the "admin settings->groups->edit group sidebar panel"

    # spaces
    And "Brian" navigates to the project spaces management page
    And "Brian" checks the accessibility of the DOM selector "#admin-settings-view-wrapper" on the "admin settings->spaces"
    And "Brian" selects the space "my_space"
    And "Brian" checks the accessibility of the DOM selector "#admin-settings-view-wrapper" on the "admin settings->spaces"
    And "Brian" lists the members of project space "my_space" using a sidebar panel
    And "Brian" checks the accessibility of the DOM selector "#sidebar-panel-SpaceMembers" on the "admin settings->spaces->members sidebar panel"


    ## 6. space page
    And "Alice" navigates to the project space "my_space"
    And "Alice" checks the accessibility of the DOM selector "#files-view" on the "project space page"
    And "Brian" opens the "files" app
    And "Brian" navigates to the projects space page
    And "Brian" checks the accessibility of the DOM selector "#files-view" on the "project spaces page"
    
    
    ## 7. app-sidebar (right sidebar)
    And "Alice" opens the "files" app
    And "Alice" opens the right sidebar of the resource "lorem.txt"
    And "Alice" checks the accessibility of the DOM selector "#sidebar-panel-details" on the "right sidebar"
    And "Alice" opens a "actions" panel of the resource "lorem.txt"
    And "Alice" checks the accessibility of the DOM selector "#sidebar-panel-actions" on the "right sidebar->actions panel"
    And "Alice" opens a "versions" panel of the resource "lorem.txt"
    And "Alice" checks the accessibility of the DOM selector "#sidebar-panel-versions" on the "right sidebar->versions panel"
    And "Alice" opens a "activities" panel of the resource "lorem.txt"
    And "Alice" checks the accessibility of the DOM selector "#sidebar-panel-activities" on the "right sidebar->activities panel"
    And "Alice" opens a "sharing" panel of the resource "lorem.txt"
    And "Alice" checks the accessibility of the DOM selector "#sidebar-panel-sharing" on the "right sidebar->sharing panel"

    # check create public link modal and link role dropdown
    And "Alice" creates a public link of following resource using the sidebar panel
      | resource | role             | password |
      | parent   | Secret File Drop | %public% |

    ## 8. public link page
    And "Anonymous" opens the public link "Unnamed link"
    And "Anonymous" checks the accessibility of the DOM selector "#opencloud" on the "public link page->before unlock"
    And "Anonymous" unlocks the public link with password "%public%"
    And "Anonymous" checks the accessibility of the DOM selector "#files" on the "public link page"

    And "Alice" logs out
    And "Brian" logs out

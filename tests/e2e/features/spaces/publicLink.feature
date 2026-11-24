Feature: spaces public link

  Scenario: public link for space
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
      | Carol |
      | David |
      | Edith |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the project space using API "team"
    And "Alice" creates the following folder in space "team" using API
      | name                  |
      | spaceFolder/subFolder |
    And "Alice" creates the following files in space "team" using API
      | name                                  | content   |
      | spaceFolder/shareToBrian.txt          | some text |
      | spaceFolder/subFolder/shareToBrian.md | readme    |
    And "Alice" uploads the following local files into space "team" using API
      | localFile      | to             |
      | simple.pdf     | simple.pdf     |
      | testavatar.jpg | testavatar.jpg |
    And "Alice" adds the following members to the space "team" using API
      | user  | role       | shareType |
      | Brian | Can edit   | user      |
      | Carol | Can view   | user      |
      | David | Can manage | user      |
    And "Alice" creates a public link of the space using API
      | space | name      | password |
      | team  | spaceLink | %public% |
    And "Alice" creates a public link of following resource using API
      | resource                              | space | name         | password |
      | spaceFolder                           | team  | folderLink   | %public% |
      | spaceFolder/shareToBrian.txt          | team  | textLink     | %public% |
      | spaceFolder/subFolder/shareToBrian.md | team  | markdownLink | %public% |
      | simple.pdf                            | team  | pdfLink      | %public% |
      | testavatar.jpg                        | team  | imageLink    | %public% |
    When "Brian" logs in
    And "Brian" opens the public link "spaceLink"
    And "Brian" unlocks the public link with password "%public%"
    Then "Brian" should not be able to edit the public link named "spaceLink"
    And "Brian" should not be able to edit the public link named "folderLink"
    When "Brian" opens the public link "textLink"
    And "Brian" unlocks the public link with password "%public%"
    Then "Brian" is in a text-editor
    And "Brian" closes the file viewer
    When "Brian" opens the public link "markdownLink"
    And "Brian" unlocks the public link with password "%public%"
    Then "Brian" is in a text-editor
    And "Brian" closes the file viewer
    And "Brian" logs out
    When "Carol" logs in
    And "Carol" opens the public link "spaceLink"
    And "Carol" unlocks the public link with password "%public%"
    But "Carol" should not be able to edit the public link named "spaceLink"
    And "Carol" should not be able to edit the public link named "folderLink"
    When "Carol" opens the public link "folderLink"
    And "Carol" unlocks the public link with password "%public%"
    Then "Carol" should not be able to edit folder "subFolder"
    When "Carol" opens the public link "pdfLink"
    And "Carol" unlocks the public link with password "%public%"
    Then "Carol" is in a pdf-viewer
    And "Carol" closes the file viewer
    And "Carol" logs out
    When "David" logs in
    And "David" opens the public link "spaceLink"
    And "David" unlocks the public link with password "%public%"
    And "David" edits the public link named "spaceLink" of the space changing role to "Can edit"
    And "David" edits the public link named "folderLink" of resource "spaceFolder" changing role to "Can edit"
    When "David" opens the public link "imageLink"
    And "David" unlocks the public link with password "%public%"
    Then "David" is in a media-viewer
    And "David" closes the file viewer
    And "David" logs out

    # download a folder in the public link as authenticated user
    When "Edith" logs in
    And "Edith" opens the public link "folderLink"
    And "Edith" unlocks the public link with password "%public%"
    And "Edith" downloads the following public link resources using the context menu
      | resource  | type   |
      | subFolder | folder |
    And "Edith" logs out
    # download a folder in the public link as anonymous user
    And "Anonymous" opens the public link "folderLink"
    And "Anonymous" unlocks the public link with password "%public%"
    And "Anonymous" downloads the following public link resources using the context menu
      | resource  | type   |
      | subFolder | folder |

  Scenario: crud operation to public link for space
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    When "Alice" logs in
    And "Alice" creates the project space using API "team"
    And "Alice" creates the following file in space "team" using API
      | name        | content   |
      | example.txt | some text |
    And "Alice" navigates to the project space "team"
    And "Alice" creates a public link for the space with password "%public%" using the sidebar panel
    And "Alice" renames the most recently created public link of space to "spaceLink"
    And "Alice" edits the public link named "spaceLink" of the space changing role to "Can edit"
    And "Alice" logs out

    And "Anonymous" opens the public link "spaceLink"
    And "Anonymous" unlocks the public link with password "%public%"
    And "Anonymous" downloads the following public link resources using the context menu
      | resource    | type |
      | example.txt | file |
    And "Anonymous" uploads the following resource in public link page
      | resource      |
      | new-lorem.txt |
    And "Anonymous" renames the following public link resources
      | resource    | as          |
      | example.txt | renamed.txt |
    And "Anonymous" edits the following resource
      | resource    | content     |
      | renamed.txt | new content |
    When "Anonymous" deletes the following resources using the context menu
      | resource      |
      | renamed.txt   |
      | new-lorem.txt |

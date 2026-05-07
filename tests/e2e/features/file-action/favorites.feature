Feature: Favorites
  As a user
  I want to mark resources as favorites and find them in the favorites section

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |

  Scenario: mark resources as favorites
    Given "Admin" assigns following roles to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the following project space using API
      | name         | id           |
      | service-team | service-team |
    And "Alice" creates the following folder in space "service-team" using API
      | name        |
      | spaceFolder |
    And "Alice" creates the following file in space "service-team" using API
      | name      | content    |
      | lorem.txt | space team |
    And "Alice" adds the following members to the space "service-team" using API
      | user  | role     | shareType |
      | Brian | Can view | user      |
    And "Alice" creates the following folder in personal space using API
      | name   |
      | shared |
    And "Alice" uploads the following local file into personal space using API
      | localFile      | to                    |
      | testavatar.jpg | shared/testavatar.jpg |
    And "Alice" shares the following resource using API
      | resource | recipient | type  | role     |
      | shared   | Brian     | user  | Can edit |
    And "Brian" uploads the following local file into personal space using API
      | localFile       | to        |
      | user-avatar.png | image.png |
      | test_video.mp4  | video.mp4 |
    

    And "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" opens folder "shared"
    When "Brian" marks the following resources as favorite using "context menu"
      | resource        |
      | testavatar.jpg  |
    And "Brian" navigates to the project space "service-team"
    And "Brian" marks the following resources as favorite using "batch action"
      | resource     |
      | spaceFolder  |
      | lorem.txt    |
    And "Brian" navigates to the personal space page
    And "Brian" marks the following resources as favorite using "sidebar panel"
      | resource   |
      | image.png  |
    And "Brian" opens the following file in mediaviewer
      | resource  |
      | video.mp4 |
    And "Brian" is in a media-viewer
    And "Brian" marks the following resources as favorite using "preview"
      | resource  |
      | video.mp4 |
    And "Brian" closes the file viewer
    And "Brian" navigates to the favorites page
    And following resources should be displayed in the files list for user "Brian"
      | resource       |
      | testavatar.jpg |
      | spaceFolder    |
      | lorem.txt      |
      | image.png      |
      | video.mp4      |
    And "Brian" removes the following resources from favorites using "context menu"
      | resource     |
      | spaceFolder  |
    And "Brian" removes the following resources from favorites using "batch action"
      | resource  |
      | lorem.txt |
      | image.png |
    And following resources should not be displayed in the files list for user "Brian"
      | resource       |
      | spaceFolder    |
      | lorem.txt      |
      | image.png      |
    And "Brian" logs out

Feature: profile photo
  As a user, I want to provide my avatar to make my actions more visible

  Scenario: set profile photo
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" logs in
    And "Alice" opens the user menu
    And "Alice" should not have a profile picture

    When "Alice" uploads the profile image "testavatar.jpeg"
    Then "Alice" should have a profile picture

    When "Alice" changes the profile image "testavatar.png"
    Then "Alice" should have a profile picture

    When "Alice" deletes the profile image
    Then "Alice" should not have a profile picture
    And "Alice" logs out


  Scenario: profile photo
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |
      | Carol |
    And "Alice" has uploads the profile image "testavatar.jpeg" using API
    And "Brian" has uploads the profile image "user-avatar.png" using API
    And "Alice" creates the following folder in personal space using API
      | name         |
      | sharedFolder |
    And "Alice" shares the following resource using API
      | resource       | recipient | type | role     |
      | sharedFolder   | Brian     | user | Can edit |
      | sharedFolder   | Carol     | user | Can edit |

    When "Alice" logs in
    Then "Alice" should see the following recipients
      | resource     | recipient | hasAvatar |
      | sharedFolder | Brian     | true     |
      | sharedFolder | Carol     | false    |
    And "Alice" should see "Brian" avatar for the resource "sharedFolder" in the activity panel
    And "Alice" navigates to the shared with others page
    And "Alice" switches to the "table" view
    And "Alice" should see "recipient" avatar for the resource "sharedFolder"
    And "Alice" should see the following recipients
      | resource     | recipient | hasAvatar |
      | sharedFolder | Brian     | true     |
      | sharedFolder | Carol     | false    |
    And "Alice" logs out

    When "Brian" logs in
    Then "Brian" should see sharer avatar in the notification
    And "Brian" navigates to the shared with me page
    And "Brian" switches to the "table" view
    And "Brian" should see "sharer" avatar for the resource "sharedFolder"
    And "Brian" should see "recipient" avatar for the resource "sharedFolder"
    And "Brian" logs out

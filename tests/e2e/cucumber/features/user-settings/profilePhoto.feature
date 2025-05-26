Feature: profile photo
  As a user, I want to provide my avatar to make my actions more visible

  Scenario: profile photo
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

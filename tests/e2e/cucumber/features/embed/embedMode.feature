Feature: Embed mode with delegated authentication

  As an integrator embedding the web UI in an iframe
  I want embed mode to survive the internal auth redirect
  So that embed query params are not silently lost after authentication


  Scenario: embed mode stays active after delegated authentication
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    When "Alice" opens the app in embed mode with delegated authentication
    Then "Alice" should see the embed mode actions
    And "Alice" should not see the full web UI

@a11y
Feature: Keyboard accessibility
  As a keyboard or screen reader user
  I want to operate the app without a mouse
  So that I don't lose my place or act on the wrong item

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" creates the following folders in personal space using API
      | name   |
      | folder |
    And "Alice" uploads the following local file into personal space using API
      | localFile       | to              |
      | lorem.txt       | lorem.txt       |
      | testavatar.jpeg | testavatar.jpeg |
    And "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" switches to the "table" view


  Scenario: files table controls have meaningful names
    Then "Alice" should see the resource name in the accessible name of every row checkbox
    And "Alice" should see the visible label in the accessible name of every sort button
    And "Alice" logs out


  Scenario: space key toggles the focused row checkbox
    When "Alice" selects the resource "lorem.txt" using the checkbox
    And "Alice" toggles the checkbox of resource "testavatar.jpeg" using the space key
    Then "Alice" should see the following resource selection
      | resource        | selected |
      | lorem.txt       | true     |
      | testavatar.jpeg | true     |
      | folder          | false    |
    And "Alice" logs out


  # @issue-3795 #11
  @skip
  Scenario: focus is kept after closing a modal or deleting a resource
    When "Alice" opens the "rename" action of resource "lorem.txt" using the context menu
    And "Alice" closes the modal using the escape key
    Then "Alice" should not lose the keyboard focus
    When "Alice" deletes the following resource using the context menu
      | resource  |
      | lorem.txt |
    Then "Alice" should not lose the keyboard focus
    And "Alice" logs out


  Scenario: arrow keys stay inside a non-menu dropdown
    When "Alice" selects the resource "lorem.txt" using the checkbox
    And "Alice" clicks the element "#files-view-options-btn"
    And "Alice" presses the "Tab" key
    Then "Alice" should see the keyboard focus inside ".oc-drop"
    When "Alice" presses the "ArrowDown" key
    Then "Alice" should see the keyboard focus inside ".oc-drop"
    And "Alice" should see the following resource selection
      | resource        | selected |
      | lorem.txt       | true     |
      | testavatar.jpeg | false    |
    And "Alice" logs out


  Scenario: mobile navigation drawer traps the focus and closes with escape
    When "Alice" switches to the "mobile" viewport
    And "Alice" clicks the element "#mobile-nav-button"
    Then "Alice" should see the keyboard focus inside "#sidebar-nav-mobile-panel"
    When "Alice" presses the "Tab" key 20 times
    Then "Alice" should see the keyboard focus inside "#sidebar-nav-mobile-panel"
    When "Alice" presses the "Escape" key
    Then "Alice" should not see the element "#sidebar-nav-mobile-panel"
    And "Alice" should see the keyboard focus inside "#mobile-nav-button"
    And "Alice" switches to the "desktop" viewport
    And "Alice" logs out

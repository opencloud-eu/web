Feature: Kindergarten can use web to organize a day

  As a kindergarten operator named Alice
  I want to manage all file related operations by using OpenCloud Web
  So that i'm sure all parents are informed and have the latest information in a easy and secure way

  Background:
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
      | Carol |
    And "Admin" creates following groups using API
      | id       |
      | sales    |
      | security |
    And "Admin" adds user to the group using API
      | user  | group |
      | Brian | sales |

  @firefox-skip @webkit-skip @timeout:300000
  Scenario: Alice can share this weeks meal plan with all parents
    When "Alice" logs in
    And "Alice" navigates to the personal space page
    And "Alice" creates the following resources
      | resource                             | type   |
      | groups                               | folder |
      | groups/Kindergarten Koalas           | folder |
      | groups/Pre-Schools Pirates           | folder |
      | groups/Teddy Bear Daycare            | folder |
      | groups/Kindergarten Koalas/meal plan | folder |
      | groups/Pre-Schools Pirates/meal plan | folder |
      | groups/Teddy Bear Daycare/meal plan  | folder |
    And "Alice" uploads the following resources
      | resource          | to                                   |
      | PARENT/parent.txt | groups/Kindergarten Koalas/meal plan |
      | lorem.txt         | groups/Kindergarten Koalas/meal plan |
      | lorem-big.txt     | groups/Kindergarten Koalas/meal plan |
      | data.zip          | groups/Pre-Schools Pirates/meal plan |
      | lorem.txt         | groups/Pre-Schools Pirates/meal plan |
      | lorem-big.txt     | groups/Pre-Schools Pirates/meal plan |
      | data.zip          | groups/Teddy Bear Daycare/meal plan  |
      | lorem.txt         | groups/Teddy Bear Daycare/meal plan  |
      | lorem-big.txt     | groups/Teddy Bear Daycare/meal plan  |
    And "Alice" shares the following resources using the sidebar panel
      | resource                                           | recipient | type  | role     | resourceType |
      | groups/Pre-Schools Pirates/meal plan               | Brian     | user  | Can edit | folder       |
      | groups/Pre-Schools Pirates/meal plan               | Carol     | user  | Can edit | folder       |
      | groups/Pre-Schools Pirates/meal plan/lorem-big.txt | sales     | group | Can view | file         |
      | groups/Pre-Schools Pirates/meal plan/lorem-big.txt | Carol     | user  | Can view | file         |
      | groups/Kindergarten Koalas/meal plan               | sales     | group | Can view | folder       |
      | groups/Kindergarten Koalas/meal plan               | security  | group | Can edit | folder       |
      | groups/Kindergarten Koalas/meal plan/lorem.txt     | sales     | group | Can view | file         |
      | groups/Kindergarten Koalas/meal plan/lorem.txt     | security  | group | Can view | file         |
      | groups/Teddy Bear Daycare/meal plan                | Brian     | user  | Can edit | folder       |
      | groups/Teddy Bear Daycare/meal plan                | Carol     | user  | Can edit | folder       |
      | groups/Teddy Bear Daycare/meal plan/data.zip       | Brian     | user  | Can edit | file         |
      | groups/Teddy Bear Daycare/meal plan/data.zip       | Carol     | user  | Can edit | file         |
    # update share
    And "Alice" updates following sharees role
      | resource                                           | recipient | type  | role     | resourceType |
      | groups/Pre-Schools Pirates/meal plan               | Carol     | user  | Can view | folder       |
      | groups/Pre-Schools Pirates/meal plan/lorem-big.txt | sales     | group | Can edit | file         |
      | groups/Kindergarten Koalas/meal plan               | sales     | group | Can edit | folder       |
      | groups/Teddy Bear Daycare/meal plan/data.zip       | Carol     | user  | Can edit | file         |
    When "Brian" logs in
    And "Brian" navigates to the shared with me page
    And "Brian" downloads the following resource using the context menu
      | resource | from      | type |
      | data.zip | meal plan | file |
    When "Carol" logs in
    And "Carol" navigates to the shared with me page
    And "Carol" downloads the following resources using the context menu
      | resource      | from      | type   |
      | data.zip      | meal plan | file   |
      | lorem.txt     | meal plan | file   |
      | lorem-big.txt | meal plan | file   |
      | meal plan     |           | folder |
    And "Carol" logs out
    And "Brian" logs out
    And "Alice" downloads the following resources using the context menu
      | resource            | from                                 | type   |
      | parent.txt          | groups/Kindergarten Koalas/meal plan | file   |
      | lorem.txt           | groups/Kindergarten Koalas/meal plan | file   |
      | lorem-big.txt       | groups/Kindergarten Koalas/meal plan | file   |
      | meal plan           | groups/Kindergarten Koalas           | folder |
      | groups              |                                      | folder |
    And "Alice" deletes the following resources using the batch action
      | resource            | from                                 |
      | lorem.txt           | groups/Kindergarten Koalas/meal plan |
      | lorem-big.txt       | groups/Kindergarten Koalas/meal plan |
      | Kindergarten Koalas | groups                               |
      | Pre-Schools Pirates | groups                               |
      | Teddy Bear Daycare  | groups                               |
    And "Alice" logs out

Feature: als-static-oracle-svc server

Scenario: Health Check
  Given als-static-oracle-svc server
  When I get 'Health Check' response
  Then The status should be 'OK'

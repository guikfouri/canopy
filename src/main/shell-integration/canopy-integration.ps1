# Canopy terminal shell integration for PowerShell Core (pwsh)
# Emits OSC 133 escape sequences at command boundaries.
# Loaded via -File argument — does NOT modify the user's $PROFILE.

# Guard against double-loading
if ($env:__CANOPY_SHELL_INTEGRATION) { return }
$env:__CANOPY_SHELL_INTEGRATION = '1'

function prompt {
  # OSC 133;A — prompt start
  [Console]::Write("`e]133;A`a")
  $result = "PS $($executionContext.SessionState.Path.CurrentLocation)> "
  # OSC 133;B — prompt end / input start
  [Console]::Write("`e]133;B`a")
  $result
}

# OSC 133;C — command start (fires before each command executes)
$ExecutionContext.SessionState.InvokeCommand.PreCommandLookupAction = {
  param($commandName, $eventArgs)
  # Only emit once per command (skip built-in lookup noise)
  if ($eventArgs.CommandOrigin -eq 'Runspace') {
    [Console]::Write("`e]133;C`a")
  }
}

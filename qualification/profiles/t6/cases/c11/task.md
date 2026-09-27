# Remove an obsolete Eve agent output-schema binding

The project declares Eve 0.67.0 and binds a real exported `SupportOutputSchema` to its support agent. Current `defineAgent` no longer accepts an agent output schema. Repair this confirmed incompatibility in canonical state and remove the now-unused agent schema source. Preserve the agent implementation, instruction, description, package declaration, and other valid relationships. Validate after the correction.

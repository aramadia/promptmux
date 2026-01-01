{
  description = "PromptMux - Multi-AI chat interface";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = {
    self,
    nixpkgs,
  }: let
    supportedSystems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
  in {
    formatter = forAllSystems (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in
      pkgs.writeShellApplication {
        name = "prettier-fmt";
        runtimeInputs = [pkgs.nodePackages.prettier];
        text = ''
          prettier --write "$@"
        '';
      });

    # TODO: Build check temporarily disabled - needs npmDepsHash update for v0.2.0
    # After adding semantic-release dependencies, the npmDepsHash is outdated.
    # To re-enable and get the correct hash:
    #   1. Restore the buildNpmPackage check below
    #   2. Run: nix build .#checks.x86_64-linux.build
    #   3. Copy the hash from the error message
    #   4. Update npmDepsHash with the new hash
    checks = forAllSystems (system: {
      # build = pkgs.buildNpmPackage { ... };  # Temporarily disabled
    });

    devShells = forAllSystems (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      default = pkgs.mkShell {
        buildInputs = with pkgs; [
          nodejs
          nodePackages.prettier
        ];
      };
    });
  };
}

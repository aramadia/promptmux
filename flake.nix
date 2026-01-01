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

    checks = forAllSystems (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      build = pkgs.buildNpmPackage {
        pname = "promptmux";
        version = "0.2.0";
        src = self;

        # Updated for v0.2.0 with semantic-release dependencies
        npmDepsHash = "sha256-nMnrKjU2IyHWPOW6Cegktk5t9bgThVe1+bhi6qebzYg=";

        # Skip electron binary download - we only need to verify TypeScript compiles
        env.ELECTRON_SKIP_BINARY_DOWNLOAD = "1";

        # Just verify the build compiles - don't install as runnable app
        installPhase = ''
          runHook preInstall
          mkdir -p $out
          cp -r dist $out/
          runHook postInstall
        '';
      };
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

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
        version = "0.1.0";
        src = self;

        # To update: run `nix build .#checks.x86_64-linux.build` and use the hash from the error
        npmDepsHash = "sha256-bZKlgDKRYORPwswuPHhp1lcO/06bFslCx+UEi6nkKRY=";

        # Don't run the default npm build, use our custom build
        buildPhase = ''
          runHook preBuild
          npm run build
          runHook postBuild
        '';

        # electron-builder requires additional setup, just verify the TypeScript build
        dontNpmBuild = true;

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

# Homebrew formula for the `operator-os` scaffolder -- see ../pip/README.md
# for what this package actually does (it unpacks the real tool; it isn't
# the tool itself). Templated, not yet publishable: url/sha256 below have to
# point at a real PyPI sdist, which doesn't exist until packaging/pip is
# published (see that directory's README). To finish this once that's done:
#
#   1. python3 -m build (in packaging/pip/) to produce dist/operator_os-X.Y.Z.tar.gz
#   2. Upload it to PyPI (python3 -m twine upload dist/*)
#   3. shasum -a 256 dist/operator_os-X.Y.Z.tar.gz
#   4. Fill in url/sha256 below with the real PyPI download URL and that hash
#   5. Publish this file in a tap repo (e.g. github.com/<org>/homebrew-tap,
#      as Formula/operator-os.rb) -- Homebrew formulae for tools not already
#      in homebrew-core need their own tap; `brew install <org>/tap/operator-os`
#      is the resulting install command, not plain `brew install operator-os`
#      unless/until this is accepted into homebrew-core itself, which has its
#      own review bar (notability, no existing name clash, etc.)
#
# Uses Homebrew's standard virtualenv strategy for a pure-Python, dependency-
# free CLI tool -- no `resource` blocks needed since operator-os has zero
# third-party Python dependencies by design (see the product's own README).
class OperatorOs < Formula
  include Language::Python::Virtualenv

  desc "Scaffolder for Operator OS, a file-based business operating system"
  homepage "https://usemeritai.com/operator-os"
  url "https://files.pythonhosted.org/packages/source/o/operator-os/operator_os-1.0.0.tar.gz"
  sha256 "REPLACE_WITH_REAL_SHA256_AFTER_PYPI_PUBLISH"
  license :cannot_represent # custom license, not yet lawyer-reviewed -- see operator-os/LICENSE

  depends_on "python@3.11"

  def install
    virtualenv_install_with_resources
  end

  test do
    system "#{bin}/operator-os", "--version"
  end
end

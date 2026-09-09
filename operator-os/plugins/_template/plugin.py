"""
__PLUGIN_TITLE__.

Three functions matter here and only the first one is required.

    register(reg, ctx)   add commands. Called only if the manifest declares
                         the commands capability.
    tools()              paths to the SKILL.md files this plugin ships.
    check(ctx)           your own self test. Return a list of problems, or an
                         empty list. `os plugin verify` runs it.

ctx.data is the data layer. Reading is always allowed. Writing raises unless the
manifest declares the writes capability, and the refusal names this plugin and
the capability it is missing.
"""


def register(reg, ctx):
    def cmd_hello(args):
        cfg = ctx.config()
        print("\n{} version {}".format(ctx.title or ctx.name, ctx.version))
        print("  business:     {}".format(cfg.get("business_name")))
        print("  contacts:     {}".format(len(ctx.data.load("contacts"))))
        print("  capabilities: {}".format(", ".join(ctx.capabilities)))
        print("  plugin folder: {}\n".format(ctx.path))
        return 0

    reg.add("__PLUGIN_NAME__", cmd_hello,
            group="plugin",
            summary="replace this with something worth running",
            group_blurb="added by plugins")


def check(ctx):
    problems = []
    if not ctx.config().get("business_name"):
        problems.append("business_name is blank in business.yml")
    return problems

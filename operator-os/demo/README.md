# demo

`engine.js` is a JavaScript port of the python engine. It exists so a browser can
run the real thing instead of replaying a recording, and it is what the public
demo page runs.

`data.json` is generated, not shipped. Rebuild it with:

```
python3 scripts/build_demo_data.py
```

Then prove the port still matches the product:

```
python3 tests/test_parity.py
```

If that ever fails, the demo has drifted away from the thing it is selling, and
the demo is wrong, not the engine.

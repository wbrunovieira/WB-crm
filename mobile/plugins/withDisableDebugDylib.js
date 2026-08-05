const { withPodfile } = require("@expo/config-plugins");

// Xcode's "Debug Dylib" (ENABLE_DEBUG_DYLIB) speeds up incremental Debug builds by linking the
// app's own code into a dylib instead of the main executable. This project links SwiftUI-based
// pods (ExpoUI/ExpoGlassEffect, via expo-router's @expo/ui and expo-glass-effect) that pull in
// SwiftUICore — Apple restricts that framework to an "allowed clients" list that a dylib product
// isn't on, so Debug builds fail at link time with:
//   "cannot link directly with 'SwiftUICore' because product being built is not an allowed
//   client of it"
// Forcing ENABLE_DEBUG_DYLIB off makes Xcode fall back to static linking into the main
// executable (slightly slower incremental builds, but it actually links).
const HOOK = `
    installer.aggregate_targets.map(&:user_project).uniq(&:path).each do |user_project|
      user_project.build_configurations.each do |config|
        config.build_settings["ENABLE_DEBUG_DYLIB"] = "NO"
      end
      user_project.save
    end
`;

const CCACHE_CALL_END =
  /(:ccache_enabled\s*=>\s*ccache_enabled\?\(podfile_properties\),\s*\n\s*\))/;

module.exports = function withDisableDebugDylib(config) {
  return withPodfile(config, (config) => {
    const { contents } = config.modResults;
    if (contents.includes("ENABLE_DEBUG_DYLIB")) {
      return config;
    }
    if (!CCACHE_CALL_END.test(contents)) {
      throw new Error(
        "withDisableDebugDylib: could not find the react_native_post_install() call in the generated Podfile to patch."
      );
    }
    config.modResults.contents = contents.replace(CCACHE_CALL_END, `$1\n${HOOK}`);
    return config;
  });
};

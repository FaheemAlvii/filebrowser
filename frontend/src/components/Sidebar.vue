<template>
  <div v-show="active" @click="closeHovers" class="overlay"></div>
  <nav :class="{ active }">
    <!-- Brand Header matching odoo-server-reborn -->
    <div class="sidebar-brand-header">
      <div class="brand-badge-container">
        <div class="brand-icon-box">
          <img :src="logoURL" :alt="name" class="brand-logo-img" />
          <span class="live-ping-dot">
            <span class="ping-animate"></span>
            <span class="ping-core"></span>
          </span>
        </div>
        <div class="brand-text-col">
          <div class="brand-title-row">
            <span class="brand-name">{{ name }}</span>
            <span class="brand-tag">CLOUD</span>
          </div>
          <span class="brand-subtitle">{{ version || "v3.0.0" }} • osfm-core</span>
        </div>
      </div>
    </div>

    <!-- Cluster Node Status Banner matching odoo-server-reborn -->
    <div class="sidebar-status-banner">
      <div class="status-content">
        <span class="status-left">
          <span class="node-dot"></span>
          <span>Storage Node</span>
        </span>
        <span class="status-badge">Ready</span>
      </div>
    </div>

    <!-- Nav groups matching odoo-server-reborn -->
    <div class="sidebar-nav-scroll">
      <template v-if="isLoggedIn">
        <!-- Storage & Files Group -->
        <div class="nav-group">
          <div class="nav-group-title">Storage & Files</div>
          <button
            class="action nav-item"
            :class="{ active: isFilesRoute }"
            @click="toRoot"
            :aria-label="$t('sidebar.myFiles')"
            :title="$t('sidebar.myFiles')"
          >
            <span v-if="isFilesRoute" class="active-bar"></span>
            <i class="material-icons">folder</i>
            <span>{{ $t("sidebar.myFiles") }}</span>
          </button>
        </div>

        <!-- File Actions Group -->
        <div v-if="user.perm.create" class="nav-group">
          <div class="nav-group-title">Actions</div>
          <button
            @click="showHover('newDir')"
            class="action nav-item"
            :aria-label="$t('sidebar.newFolder')"
            :title="$t('sidebar.newFolder')"
          >
            <i class="material-icons">create_new_folder</i>
            <span>{{ $t("sidebar.newFolder") }}</span>
          </button>

          <button
            @click="showHover('newFile')"
            class="action nav-item"
            :aria-label="$t('sidebar.newFile')"
            :title="$t('sidebar.newFile')"
          >
            <i class="material-icons">note_add</i>
            <span>{{ $t("sidebar.newFile") }}</span>
          </button>
        </div>

        <!-- Administration Group -->
        <div class="nav-group">
          <div class="nav-group-title">Administration</div>
          <button
            @click="toAccountSettings"
            class="action nav-item"
            :class="{ active: isProfileRoute }"
            :aria-label="user.username"
            :title="user.username"
          >
            <span v-if="isProfileRoute" class="active-bar"></span>
            <i class="material-icons">person</i>
            <span>{{ user.username }}</span>
          </button>

          <button
            v-if="user.perm.admin"
            class="action nav-item"
            :class="{ active: isGlobalSettingsRoute }"
            @click="toGlobalSettings"
            :aria-label="$t('sidebar.settings')"
            :title="$t('sidebar.settings')"
          >
            <span v-if="isGlobalSettingsRoute" class="active-bar"></span>
            <i class="material-icons">settings_applications</i>
            <span>{{ $t("sidebar.settings") }}</span>
          </button>
        </div>
      </template>

      <template v-else>
        <div class="nav-group">
          <div class="nav-group-title">Authentication</div>
          <router-link
            v-if="!hideLoginButton"
            class="action nav-item"
            to="/login"
            :aria-label="$t('sidebar.login')"
            :title="$t('sidebar.login')"
          >
            <i class="material-icons">exit_to_app</i>
            <span>{{ $t("sidebar.login") }}</span>
          </router-link>

          <router-link
            v-if="signup"
            class="action nav-item"
            to="/login"
            :aria-label="$t('sidebar.signup')"
            :title="$t('sidebar.signup')"
          >
            <i class="material-icons">person_add</i>
            <span>{{ $t("sidebar.signup") }}</span>
          </router-link>
        </div>
      </template>
    </div>

    <!-- Footer Controls -->
    <div class="sidebar-footer">
      <!-- Disk Usage Card -->
      <div
        class="disk-usage-box"
        v-if="isFiles && !disableUsedPercentage"
      >
        <div class="disk-usage-header">
          <span>Disk Usage</span>
          <span class="disk-percentage">{{ usage.usedPercentage }}%</span>
        </div>
        <progress-bar :val="usage.usedPercentage" size="small" bar-color="var(--blue)" bg-color="var(--borderPrimary)" :bar-border-radius="4"></progress-bar>
        <div class="disk-usage-sub">
          {{ $t("sidebar.diskUsed", { used: usage.used, total: usage.total }) }}
        </div>
      </div>

      <!-- Theme Toggle matching odoo-server-reborn -->
      <button
        @click="handleToggleTheme"
        class="action nav-item theme-toggle-btn"
        title="Toggle Theme"
      >
        <i class="material-icons">{{ isDark ? "light_mode" : "dark_mode" }}</i>
        <span>{{ isDark ? "Light Mode" : "Dark Mode" }}</span>
      </button>

      <!-- Logout Button matching odoo-server-reborn -->
      <button
        v-if="isLoggedIn && canLogout"
        @click="logout"
        class="action nav-item logout-btn"
        id="logout"
        :aria-label="$t('sidebar.logout')"
        :title="$t('sidebar.logout')"
      >
        <i class="material-icons">exit_to_app</i>
        <span>{{ $t("sidebar.logout") }}</span>
      </button>

      <!-- Subtitle credits -->
      <div class="credits-sub">
        <span>
          <span v-if="disableExternal">{{ name }}</span>
          <a
            v-else
            rel="noopener noreferrer"
            target="_blank"
            href="https://github.com/filebrowser/filebrowser"
          >{{ name }}</a>
          <span> {{ version }}</span>
        </span>
        <a @click="help" class="help-link">{{ $t("sidebar.help") }}</a>
      </div>
    </div>
  </nav>
</template>

<script>
import { reactive, ref, onMounted } from "vue";
import { mapActions, mapState } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";

import * as auth from "@/utils/auth";
import {
  name,
  logoURL,
  version,
  signup,
  hideLoginButton,
  disableExternal,
  disableUsedPercentage,
  noAuth,
  logoutPage,
  loginPage,
} from "@/utils/constants";
import { toggleTheme, getTheme } from "@/utils/theme";
import { files as api } from "@/api";
import ProgressBar from "@/components/ProgressBar.vue";
import prettyBytes from "pretty-bytes";

const USAGE_DEFAULT = { used: "0 B", total: "0 B", usedPercentage: 0 };

export default {
  name: "sidebar",
  setup() {
    const usage = reactive(USAGE_DEFAULT);
    const isDark = ref(false);

    const updateDarkState = () => {
      isDark.value =
        document.documentElement.classList.contains("dark") ||
        getTheme() === "dark";
    };

    onMounted(() => {
      updateDarkState();
    });

    return {
      usage,
      usageAbortController: new AbortController(),
      isDark,
      updateDarkState,
    };
  },
  components: {
    ProgressBar,
  },
  inject: ["$showError"],
  computed: {
    ...mapState(useAuthStore, ["user", "isLoggedIn"]),
    ...mapState(useFileStore, ["isFiles", "reload"]),
    ...mapState(useLayoutStore, ["currentPromptName"]),
    active() {
      return this.currentPromptName === "sidebar";
    },
    name: () => name,
    logoURL: () => logoURL,
    signup: () => signup,
    hideLoginButton: () => hideLoginButton,
    version: () => version,
    disableExternal: () => disableExternal,
    disableUsedPercentage: () => disableUsedPercentage,
    canLogout: () => !noAuth && (loginPage || logoutPage !== "/login"),
    isFilesRoute() {
      return this.$route.path.startsWith("/files");
    },
    isProfileRoute() {
      return this.$route.path.startsWith("/settings/profile");
    },
    isGlobalSettingsRoute() {
      return (
        this.$route.path.startsWith("/settings") &&
        !this.$route.path.startsWith("/settings/profile")
      );
    },
  },
  methods: {
    ...mapActions(useLayoutStore, ["closeHovers", "showHover"]),
    abortOngoingFetchUsage() {
      this.usageAbortController.abort();
    },
    async fetchUsage() {
      const path = this.$route.path.endsWith("/")
        ? this.$route.path
        : this.$route.path + "/";
      let usageStats = USAGE_DEFAULT;
      if (this.disableUsedPercentage) {
        return Object.assign(this.usage, usageStats);
      }
      try {
        this.abortOngoingFetchUsage();
        this.usageAbortController = new AbortController();
        const usage = await api.usage(path, this.usageAbortController.signal);
        usageStats = {
          used: prettyBytes(usage.used, { binary: true }),
          total: prettyBytes(usage.total, { binary: true }),
          usedPercentage: Math.round((usage.used / usage.total) * 100),
        };
      } finally {
        return Object.assign(this.usage, usageStats);
      }
    },
    handleToggleTheme() {
      toggleTheme();
      this.updateDarkState();
    },
    toRoot() {
      this.$router.push({ path: "/files" });
      this.closeHovers();
    },
    toAccountSettings() {
      this.$router.push({ path: "/settings/profile" });
      this.closeHovers();
    },
    toGlobalSettings() {
      this.$router.push({ path: "/settings/global" });
      this.closeHovers();
    },
    help() {
      this.showHover("help");
    },
    logout: auth.logout,
  },
  watch: {
    $route: {
      handler(to) {
        if (to.path.includes("/files")) {
          this.fetchUsage();
        }
      },
      immediate: true,
    },
  },
  unmounted() {
    this.abortOngoingFetchUsage();
  },
};
</script>

//
// Copyright (c) 2014-2015, THUNDERBEAST GAMES LLC All rights reserved
// LICENSE: Atomic Game Engine Editor and Tools EULA
// Please see LICENSE_ATOMIC_EDITOR_AND_TOOLS.md in repository root for
// license information: https://github.com/AtomicGameEngine/AtomicGameEngine
//

import EditorUI = require("ui/EditorUI");
import UIEvents = require("ui/UIEvents");
import PlayMode = require("ui/playmode/PlayMode");
import EditorLicense = require("./EditorLicense");
import EditorEvents = require("./EditorEvents");
import Preferences = require("./Preferences");

class Editor extends Atomic.ScriptObject {

    project: ToolCore.Project;
    editorLicense: EditorLicense;
    playMode: PlayMode;

    static instance: Editor;

    constructor() {

        super();

        // limit the framerate to limit CPU usage
        Atomic.getEngine().maxFps = 60;

        Atomic.getEngine().autoExit = false;

        Editor.instance = this;

        this.initUI();

        this.editorLicense = new EditorLicense();

        Preferences.getInstance().read();

        EditorUI.initialize();

        this.playMode = new PlayMode();

        Atomic.getResourceCache().autoReloadResources = true;

        this.subscribeToEvent(EditorEvents.LoadProject, (data) => this.handleEditorLoadProject(data));
        this.subscribeToEvent(EditorEvents.CloseProject, (data) => this.handleEditorCloseProject(data));
        this.subscribeToEvent("ProjectUnloaded", (data) => {
            Atomic.graphics.windowTitle = "AtomicEditor";
            this.handleProjectUnloaded(data)
        });

        this.subscribeToEvent("ExitRequested", (data) => this.handleExitRequested(data));

        this.subscribeToEvent("ProjectLoaded", (data) => {
            Atomic.graphics.windowTitle = "AtomicEditor - " + data.projectPath;
            Preferences.getInstance().registerRecentProject(data.projectPath);
        });

        this.parseArguments();
    }

    initUI() {

      var ui = Atomic.ui;
      ui.loadSkin("AtomicEditor/resources/default_skin/skin.tb.txt", "AtomicEditor/editor/skin/skin.tb.txt");
      ui.addFont("AtomicEditor/resources/vera.ttf", "Vera");
      ui.addFont("AtomicEditor/resources/MesloLGS-Regular.ttf", "Monaco");
      ui.setDefaultFont("Vera", 12);

    }

    handleEditorLoadProject(event: EditorEvents.LoadProjectEvent): boolean {

        var system = ToolCore.getToolSystem();
        if (system.project) {

            this.sendEvent(UIEvents.MessageModalEvent,
                { type: "error", title: "Project already loaded", message: "Project already loaded" });

            return false;

        }
        return system.loadProject(event.path);
    }

    checkIfEverythingClosed() {
        var editor = EditorUI.getCurrentResourceEditor();
        if (!editor) {
            this.sendEvent("AllResourceEditorsClosed");
            return;
        }
        this.subscribeToEvent("ResourceEditorClosed", (data) => {
            this.checkIfEverythingClosed();
        });
        editor.requestClose();
    }

    handleEditorCloseProject(event) {
        this.subscribeToEvent("AllResourceEditorsClosed", (_) => {
            var system = ToolCore.getToolSystem();

            if (system.project) {

                system.closeProject();

            }
        });
        this.checkIfEverythingClosed();
    }

    handleProjectUnloaded(event) {

        this.sendEvent(EditorEvents.ActiveSceneChange, { scene: null });



    }

    parseArguments() {

        var args = Atomic.getArguments();

        var idx = 0;

        while (idx < args.length) {

            if (args[idx] == "--project") {

                this.sendEvent(EditorEvents.LoadProject, { path: args[idx + 1] });

            }

            idx++;

        }

    }

    // event handling
    handleExitRequested(data) {
      this.subscribeToEvent("AllResourceEditorsClosed", (_) => {
          Preferences.getInstance().write();
          EditorUI.shutdown();
          Atomic.getEngine().exit();
      });
      this.checkIfEverythingClosed();
    }


}

export = Editor;

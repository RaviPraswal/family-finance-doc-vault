# Workspace Rules & Environment Roles

* **SIT Environment Repository (Local Development / Testing):** [family-finance-doc-vault](file:///d:/Personal%20Projects/Antigravity-projects/family-finance-doc-vault) (corresponding remote: `https://github.com/RaviPraswal/family-finance-doc-vault`)
* **Production Environment Repository (Live Deployment):** [family-finance-doc-vault-online](file:///d:/Personal%20Projects/Antigravity-projects/family-finance-doc-vault-online) (corresponding remote: `https://github.com/RaviPraswal/family-finance-doc-vault-online`)

## Guidelines:
1. Treat the `family-finance-doc-vault` repository as the **SIT (System Integration Testing)** environment.
2. Treat the `family-finance-doc-vault-online` repository as the **Production** environment.
3. Keep this separation in mind for all development, config changes, database migrations, and deployments.
4. **Git Branching Policy:** When working on a feature implementation or bug fix, **do not push code directly to the `main` branch**. Always create a separate, descriptively named git branch for those specific changes. This ensures we can review and track exactly what changes were made before merging them into production.
5. **Git Push Constraint:** **Do not push code to any remote repository branch** (whether main or a feature branch) unless explicitly requested/confirmed by the user first.
6. **Commit Message Standard:** For each and every commit, write a descriptive commit message containing a proper commit title and a detailed description detailing what feature was implemented or what bug was resolved.

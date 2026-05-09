# Form Sample

<!-- decomd: form -->
| label | name | type | default |
| --- | --- | --- | --- |
| Name | name | text | Alice |
| Email | email | email | alice@example.com |

<button type="button" id="copy-greeting">Copy greeting</button>

<script>
(() => {
  const button = document.getElementById("copy-greeting");
  button.addEventListener("click", async () => {
    const form = document.querySelector("form.decomd-form");
    const data = new FormData(form);
    const name = data.get("name") || "";
    const email = data.get("email") || "";
    await navigator.clipboard.writeText(`hello, ${name}(${email})!`);
  });
})();
</script>

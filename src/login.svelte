<script>
  import {
    Button,
    Col,
    Form,
    FormGroup,
    FormText,
    Input,
    Label
  } from "sveltestrap";
  import axios from "../public/axiosConfig"
  let name = "";
  let email = "";
  let image = "";
  const handleClick = async(event) => {
    event.preventDefault()
    console.log(email, name);
     let bodyFormData = new FormData();
        bodyFormData.set('name',name);
        bodyFormData.set('email',email);
        bodyFormData.set('image',image);
        try {
            const response = await axios.post('/login', bodyFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log(response);
        } catch (err) {
            console.error(err);
        }}
 
</script>

<Col class="h-100 justify-content-center pt-4">
  <Form>
    <FormGroup>
      <Label for="email">Email</Label>
      <Input
        bind:value={email}
        type="email"
        name="email"
        id="email"
        placeholder="example@123" />
    </FormGroup>
    <FormGroup>
      <Label for="Name">Name</Label>
      <Input
        bind:value={name}
        name="name"
        id="name"
        placeholder="name" />
    </FormGroup>
     <FormGroup>
      <Label for="Name">Image</Label>
      <Input
        bind:value={image}
        name="Image"
        id="Image"
        placeholder="Image link" />
    </FormGroup>
    <Button class="mt-2" color="success" on:click={handleClick}>Sign In</Button>
  </Form>
</Col>

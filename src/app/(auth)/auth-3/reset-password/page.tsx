import AppLogo from '@/components/AppLogo'
import { author, currentYear } from '@/helpers'
import Link from 'next/link'
import { Button, Card, CardBody, Col, Form, FormControl, InputGroup, Row } from 'react-bootstrap'

const Page = () => {
  return (
    <div className="auth-box p-0 w-100">
      <Row className="w-100 g-0">
        <Col>
          <div className="h-100 position-relative card-side-img rounded-0 overflow-hidden">
            <div className="p-4 card-img-overlay auth-overlay d-flex align-items-end justify-content-center"></div>
          </div>
        </Col>

        <Col xl="auto">
          <Card className="auth-box-form border-0 mb-0">
            <CardBody className="min-vh-100 d-flex flex-column justify-content-center">
              <div className="auth-brand mb-0 text-center">
                <AppLogo />
              </div>

              <div className="mt-auto text-center">
                <h4 className="fw-bold">¿Olvidaste tu Contraseña?</h4>
                <p className="text-muted auth-sub-text mx-auto">Ingresa tu dirección de correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>

                <Form className="mt-4">
                  <div className="mb-3">
                    <InputGroup>
                      <FormControl
                        type="email"
                        className="py-2 px-3 bg-light bg-opacity-40 border-light"
                        id="userEmail"
                        placeholder="Ingresa tu correo electrónico"
                        required
                      />
                    </InputGroup>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="form-check">
                      <input className="form-check-input form-check-input-light fs-14" type="checkbox" id="termAndPolicy" />
                      <label className="form-check-label" htmlFor="termAndPolicy">
                        Acepto los Términos y Políticas
                      </label>
                    </div>
                  </div>

                  <div className="d-grid">
                    <Button type="submit" className="btn btn-primary fw-semibold py-2">
                      Enviar Solicitud
                    </Button>
                  </div>
                </Form>
              </div>

              <p className="text-muted text-center mt-4 mb-0">
                Volver a{' '}
                <Link href="/auth-3/sign-in" className="text-decoration-underline link-offset-3 fw-semibold">
                  Iniciar Sesión
                </Link>
              </p>

              <p className="text-center text-muted mt-auto mb-0">
                ©  <span>{currentYear}</span> FIXTUREPRO — por <span className="fw-semibold">{author}</span>
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Page

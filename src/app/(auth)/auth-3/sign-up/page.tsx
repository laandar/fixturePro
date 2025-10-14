'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { registerAction } from '../../actions';
import AppLogo from '@/components/AppLogo';
import { author, currentYear } from '@/helpers';
import Link from 'next/link';
import { Button, Card, CardBody, Col, Form, InputGroup, Row, Alert, FormControl } from 'react-bootstrap';

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <div className="d-grid">
      <Button type="submit" className="btn btn-primary fw-semibold py-2" disabled={pending}>
        {pending ? 'Registrando...' : 'Crear Cuenta'}
      </Button>
    </div>
  );
}

export default function SignUpPage() {
  const [state, formAction] = useActionState(registerAction, null);

  return (
    <div className="auth-box p-0 w-100">
      <Row className="w-100 g-0">
        <Col>
          <div className="h-100 position-relative card-side-img rounded-0 overflow-hidden">
            <div className="p-4 card-img-overlay auth-overlay d-flex align-items-end justify-content-center"></div>
          </div>
        </Col>

        <Col md="auto">
          <Card className="auth-box-form border-0 mb-0">
            <CardBody className="min-vh-100 d-flex flex-column justify-content-center">
              <div className="auth-brand mb-0 text-center">
                <AppLogo />
              </div>

              <div className="mt-auto text-center">
                <h4 className="fw-bold">Crear Cuenta en FixturePro</h4>
                <p className="text-muted auth-sub-text mx-auto">
                  Completa el formulario para crear tu cuenta
                </p>

                {state?.error && (
                  <Alert variant="danger" className="mb-3 text-start">
                    {state.error}
                  </Alert>
                )}

                <Form action={formAction} className="mt-4">
                  <div className="mb-3">
                    <InputGroup>
                      <FormControl
                        type="text"
                        name="name"
                        className="py-2 px-3 bg-light bg-opacity-40 border-light"
                        placeholder="Nombre completo"
                        required
                      />
                    </InputGroup>
                  </div>

                  <div className="mb-3">
                    <InputGroup>
                      <FormControl
                        type="email"
                        name="email"
                        className="py-2 px-3 bg-light bg-opacity-40 border-light"
                        placeholder="tu@ejemplo.com"
                        required
                      />
                    </InputGroup>
                  </div>

                  <div className="mb-3">
                    <InputGroup>
                      <FormControl
                        type="password"
                        name="password"
                        className="py-2 px-3 bg-light bg-opacity-40 border-light"
                        placeholder="Contraseña (mínimo 6 caracteres)"
                        required
                        minLength={6}
                      />
                    </InputGroup>
                  </div>

                  <div className="mb-3">
                    <InputGroup>
                      <FormControl
                        type="password"
                        name="confirmPassword"
                        className="py-2 px-3 bg-light bg-opacity-40 border-light"
                        placeholder="Confirmar contraseña"
                        required
                        minLength={6}
                      />
                    </InputGroup>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="form-check">
                      <input 
                        className="form-check-input form-check-input-light fs-14" 
                        type="checkbox" 
                        id="termAndPolicy"
                        required
                      />
                      <label className="form-check-label" htmlFor="termAndPolicy">
                        Acepto los Términos y Políticas
                      </label>
                    </div>
                  </div>

                  <SubmitButton />
                </Form>
              </div>

              <p className="text-muted text-center mt-4 mb-0">
                ¿Ya tienes cuenta?{' '}
                <Link 
                  href="/auth-3/sign-in" 
                  className="text-decoration-underline link-offset-3 fw-semibold"
                >
                  Iniciar sesión
                </Link>
              </p>

              <p className="text-center text-muted mt-auto mb-0">
                © 2014 - {currentYear} FixturePro — by <span className="fw-semibold">{author}</span>
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
